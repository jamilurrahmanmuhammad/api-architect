"""
T002: Database migration for OAS specs table.

Creates the canonical OAS specification storage table with versioning
and transaction support for Feature 004.

Feature 004 - Form-Based OpenAPI Builder
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, Index, TypeDecorator, types
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
import uuid
from datetime import datetime


class GUID(TypeDecorator):
    """Platform-independent GUID type that works with SQLite, PostgreSQL, etc."""

    impl = types.CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PostgresUUID())
        else:
            return dialect.type_descriptor(types.CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            return str(uuid.UUID(value))
        else:
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        else:
            return value


Base = declarative_base()


class OASSpec(Base):
    """
    OAS specification document storage.

    The canonical representation of an API specification in OpenAPI format.
    Stores YAML or JSON content with version tracking.
    """

    __tablename__ = "oas_specs"

    # Primary key
    id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # Business key for lookups
    spec_id = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    # OAS content (YAML or JSON)
    oas_content = Column(
        Text,
        nullable=False,
    )

    # Content format
    content_format = Column(
        String(10),  # "yaml" or "json"
        default="yaml",
        nullable=False,
    )

    # Version counter (incremented on each save)
    version = Column(
        Integer,
        default=1,
        nullable=False,
    )

    # Extracted metadata for indexing/search
    api_title = Column(String(255), nullable=True, index=True)
    api_version = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # Soft delete support
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    # Metadata
    description = Column(Text, nullable=True)
    tags = Column(String(255), nullable=True)  # Comma-separated

    # Indexes for common queries
    __table_args__ = (
        Index('idx_spec_id_created', 'spec_id', 'created_at'),
        Index('idx_api_title_created', 'api_title', 'created_at'),
        Index('idx_is_deleted_created', 'is_deleted', 'created_at'),
    )

    def __repr__(self):
        return f"<OASSpec {self.spec_id} v{self.version}>"


class OASEditTransaction(Base):
    """
    Audit trail of edits to OAS specifications.

    Tracks which fields were edited, when, and by whom.
    Enables undo/redo and change tracking.
    """

    __tablename__ = "oas_edit_transactions"

    # Primary key
    id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # Reference to spec
    spec_id = Column(
        GUID(),
        nullable=False,
        index=True,
    )

    # Edit path (JSONPointer format)
    edit_path = Column(
        String(500),
        nullable=False,
        index=True,
    )

    # Previous value (before edit)
    old_value = Column(Text, nullable=True)

    # New value (after edit)
    new_value = Column(Text, nullable=True)

    # Change type
    change_type = Column(
        String(20),  # "create", "update", "delete"
        default="update",
        nullable=False,
    )

    # Timestamp
    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # User who made the edit
    edited_by = Column(String(255), nullable=True, index=True)

    # Client/session info for debugging
    session_id = Column(String(255), nullable=True)

    # Indexes for common queries
    __table_args__ = (
        Index('idx_spec_timestamp', 'spec_id', 'timestamp'),
        Index('idx_spec_path', 'spec_id', 'edit_path'),
    )

    def __repr__(self):
        return f"<OASEditTransaction {self.id} {self.edit_path}>"


class UndoRedoTransaction(Base):
    """
    Undo/Redo transaction history for a specification.

    Stores all transaction history with ordering for undo/redo stacks.
    Includes stack position tracking for efficient queries.
    """

    __tablename__ = "undo_redo_transactions"

    # Primary key
    id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # Reference to specification
    spec_id = Column(
        GUID(),
        nullable=False,
        index=True,
    )

    # Transaction details
    edit_path = Column(
        String(500),
        nullable=False,
    )

    old_value = Column(
        Text,
        nullable=True,
    )

    new_value = Column(
        Text,
        nullable=True,
    )

    change_type = Column(
        String(20),
        default="update",
        nullable=False,
    )

    # Ordering for undo/redo stack
    # Higher sequence_number = more recent
    sequence_number = Column(
        Integer,
        nullable=False,
        index=True,
    )

    # Timestamps
    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # Optional metadata
    edited_by = Column(
        String(255),
        nullable=True,
    )

    session_id = Column(
        String(255),
        nullable=True,
    )

    # Indexes for common queries
    __table_args__ = (
        Index('idx_undo_spec_sequence', 'spec_id', 'sequence_number'),
        Index('idx_undo_spec_timestamp', 'spec_id', 'timestamp'),
        Index('idx_undo_spec_path', 'spec_id', 'edit_path'),
    )

    def __repr__(self):
        return f"<UndoRedoTransaction {self.id} seq={self.sequence_number}>"


def get_migration_script() -> str:
    """Return SQL migration script for creating tables."""
    return """
    -- OAS Specs Table
    CREATE TABLE IF NOT EXISTS oas_specs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spec_id VARCHAR(255) UNIQUE NOT NULL,
        oas_content TEXT NOT NULL,
        content_format VARCHAR(10) DEFAULT 'yaml' NOT NULL,
        version INTEGER DEFAULT 1 NOT NULL,
        api_title VARCHAR(255),
        api_version VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
        description TEXT,
        tags VARCHAR(255)
    );

    -- Indexes for OAS Specs
    CREATE INDEX idx_spec_id ON oas_specs(spec_id);
    CREATE INDEX idx_api_title ON oas_specs(api_title);
    CREATE INDEX idx_created_at ON oas_specs(created_at);
    CREATE INDEX idx_updated_at ON oas_specs(updated_at);
    CREATE INDEX idx_is_deleted ON oas_specs(is_deleted);
    CREATE INDEX idx_spec_id_created ON oas_specs(spec_id, created_at);
    CREATE INDEX idx_api_title_created ON oas_specs(api_title, created_at);
    CREATE INDEX idx_is_deleted_created ON oas_specs(is_deleted, created_at);

    -- OAS Edit Transactions Table
    CREATE TABLE IF NOT EXISTS oas_edit_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spec_id UUID NOT NULL,
        edit_path VARCHAR(500) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        change_type VARCHAR(20) DEFAULT 'update' NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        edited_by VARCHAR(255),
        session_id VARCHAR(255)
    );

    -- Indexes for Edit Transactions
    CREATE INDEX idx_spec_id_trans ON oas_edit_transactions(spec_id);
    CREATE INDEX idx_edit_path ON oas_edit_transactions(edit_path);
    CREATE INDEX idx_timestamp ON oas_edit_transactions(timestamp);
    CREATE INDEX idx_edited_by ON oas_edit_transactions(edited_by);
    CREATE INDEX idx_spec_timestamp ON oas_edit_transactions(spec_id, timestamp);
    CREATE INDEX idx_spec_path ON oas_edit_transactions(spec_id, edit_path);

    -- Undo/Redo Transactions Table
    CREATE TABLE IF NOT EXISTS undo_redo_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spec_id UUID NOT NULL,
        edit_path VARCHAR(500) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        change_type VARCHAR(20) DEFAULT 'update' NOT NULL,
        sequence_number INTEGER NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        edited_by VARCHAR(255),
        session_id VARCHAR(255)
    );

    -- Indexes for Undo/Redo Transactions
    CREATE INDEX idx_spec_id_undo ON undo_redo_transactions(spec_id);
    CREATE INDEX idx_spec_sequence ON undo_redo_transactions(spec_id, sequence_number);
    CREATE INDEX idx_spec_timestamp_undo ON undo_redo_transactions(spec_id, timestamp);
    CREATE INDEX idx_spec_path_undo ON undo_redo_transactions(spec_id, edit_path);
    """
