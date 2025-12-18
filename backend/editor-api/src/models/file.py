"""
SQLAlchemy ORM models for File Management in API Architect Editor API.

Provides data models for:
- RequirementFile: DSL source files
- Service, Model, Operation, Error: Parsed DSL entities
- Version tracking and audit trails

Uses declarative base and UUID primary keys for distributed systems.
"""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum, Boolean, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from typing import Optional

# ============================================================================
# Declarative Base
# ============================================================================


class Base(DeclarativeBase):
    """SQLAlchemy ORM base class for all models."""

    pass


# ============================================================================
# RequirementFile ORM Model
# ============================================================================


class RequirementFile(Base):
    """
    ORM model for requirement files containing DSL source code.

    Attributes:
        id: Unique file identifier (UUID)
        name: File name (e.g., 'petstore-api')
        content: Raw DSL source code
        version: Auto-incrementing version for optimistic locking
        status: File lifecycle status (draft, reviewing, approved, published)
        created_at: Creation timestamp (UTC)
        updated_at: Last update timestamp (UTC)
        created_by: User ID who created the file (optional)
        parsed_at: Last successful parse timestamp (optional)

    Relationships:
        services: List of Service entities parsed from this file
        models: List of Model entities parsed from this file
        operations: List of Operation entities parsed from this file
        errors: List of Error entities parsed from this file
    """

    __tablename__ = "requirement_files"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    created_by: Mapped[Optional[str]] = mapped_column(Uuid, nullable=True)
    parsed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships (lazy="select" for explicit loading)
    services: Mapped[list["Service"]] = relationship(
        back_populates="file", cascade="all, delete-orphan", lazy="select"
    )
    models: Mapped[list["Model"]] = relationship(
        back_populates="file", cascade="all, delete-orphan", lazy="select"
    )
    operations: Mapped[list["Operation"]] = relationship(
        back_populates="file", cascade="all, delete-orphan", lazy="select"
    )
    file_errors: Mapped[list["Error"]] = relationship(
        back_populates="file", cascade="all, delete-orphan", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<RequirementFile(id={self.id}, name='{self.name}', version={self.version})>"


# ============================================================================
# Service ORM Model
# ============================================================================


class Service(Base):
    """
    ORM model for Service entities parsed from DSL.

    Represents an API service definition with metadata.

    Attributes:
        id: Unique service identifier
        file_id: Parent RequirementFile ID (foreign key)
        name: Service name (unique within file)
        title: Human-readable service title (optional)
        description: Service description (optional)
        version: API version (e.g., '1.0.0')
        base_path: API base path (e.g., '/api/v1')
        created_at: Timestamp when parsed

    Relationships:
        file: Parent RequirementFile
        operations: List of operations in this service
    """

    __tablename__ = "services"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=uuid4)
    file_id: Mapped[str] = mapped_column(
        Uuid, ForeignKey("requirement_files.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0.0")
    base_path: Mapped[str] = mapped_column(String(255), nullable=False, default="/api")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Relationships
    file: Mapped["RequirementFile"] = relationship(back_populates="services")
    operations: Mapped[list["Operation"]] = relationship(
        back_populates="service", cascade="all, delete-orphan", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Service(id={self.id}, name='{self.name}', version='{self.version}')>"


# ============================================================================
# Model ORM Model
# ============================================================================


class Model(Base):
    """
    ORM model for Model (data structure) entities parsed from DSL.

    Represents a data model definition with typed fields.

    Attributes:
        id: Unique model identifier
        file_id: Parent RequirementFile ID (foreign key)
        name: Model name (unique within file)
        description: Model description (optional)
        created_at: Timestamp when parsed

    Relationships:
        file: Parent RequirementFile
        fields: List of EntityField entries for this model
    """

    __tablename__ = "models"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=uuid4)
    file_id: Mapped[str] = mapped_column(
        Uuid, ForeignKey("requirement_files.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Relationships
    file: Mapped["RequirementFile"] = relationship(back_populates="models")
    fields: Mapped[list["EntityField"]] = relationship(
        back_populates="model", cascade="all, delete-orphan", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Model(id={self.id}, name='{self.name}')>"


# ============================================================================
# EntityField ORM Model
# ============================================================================


class EntityField(Base):
    """
    ORM model for field definitions within Model entities.

    Represents a single typed field in a data model.

    Attributes:
        id: Unique field identifier
        model_id: Parent Model ID (foreign key)
        name: Field name
        type: Field type (string, integer, boolean, etc.)
        required: Whether field is required
        description: Field description (optional)
    """

    __tablename__ = "entity_fields"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=uuid4)
    model_id: Mapped[str] = mapped_column(
        Uuid, ForeignKey("models.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    model: Mapped["Model"] = relationship(back_populates="fields")

    def __repr__(self) -> str:
        return f"<EntityField(name='{self.name}', type='{self.type}')>"


# ============================================================================
# Operation ORM Model
# ============================================================================


class Operation(Base):
    """
    ORM model for Operation entities parsed from DSL.

    Represents an API operation (endpoint) definition.

    Attributes:
        id: Unique operation identifier
        file_id: Parent RequirementFile ID (foreign key)
        service_id: Parent Service ID (foreign key)
        method: HTTP method (GET, POST, PUT, DELETE, PATCH)
        path: API endpoint path (e.g., '/pets/{id}')
        summary: Operation summary (optional)
        request_model_id: Reference to request Model ID (optional)
        response_model_id: Reference to response Model ID (optional)
        created_at: Timestamp when parsed

    Relationships:
        file: Parent RequirementFile
        service: Parent Service
    """

    __tablename__ = "operations"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=uuid4)
    file_id: Mapped[str] = mapped_column(
        Uuid, ForeignKey("requirement_files.id"), nullable=False, index=True
    )
    service_id: Mapped[str] = mapped_column(
        Uuid, ForeignKey("services.id"), nullable=False, index=True
    )
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    request_model_id: Mapped[Optional[str]] = mapped_column(
        Uuid, nullable=True
    )
    response_model_id: Mapped[Optional[str]] = mapped_column(
        Uuid, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Relationships
    file: Mapped["RequirementFile"] = relationship(back_populates="operations")
    service: Mapped["Service"] = relationship(back_populates="operations")

    def __repr__(self) -> str:
        return f"<Operation(id={self.id}, method='{self.method}', path='{self.path}')>"


# ============================================================================
# Error ORM Model
# ============================================================================


class Error(Base):
    """
    ORM model for Error entities parsed from DSL.

    Represents an API error response definition.

    Attributes:
        id: Unique error identifier
        file_id: Parent RequirementFile ID (foreign key)
        status_code: HTTP status code (400, 404, 500, etc.)
        name: Error name (e.g., 'NotFound', 'ValidationError')
        description: Error description (optional)
        created_at: Timestamp when parsed
    """

    __tablename__ = "errors"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=uuid4)
    file_id: Mapped[str] = mapped_column(
        Uuid, ForeignKey("requirement_files.id"), nullable=False, index=True
    )
    status_code: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Relationships
    file: Mapped["RequirementFile"] = relationship(back_populates="file_errors")

    def __repr__(self) -> str:
        return f"<Error(id={self.id}, status_code={self.status_code}, name='{self.name}')>"
