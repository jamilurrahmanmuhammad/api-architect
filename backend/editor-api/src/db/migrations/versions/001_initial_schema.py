"""Initial schema for Requirements Grammar Authoring Studio.

Creates tables for:
- requirement_files: DSL source files
- services: API service definitions
- models: Data structure definitions
- entity_fields: Fields within models
- operations: API operations/endpoints
- errors: Error definitions

Revision ID: 001_initial
Revises:
Create Date: 2025-12-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial database schema."""

    # Create requirement_files table
    op.create_table(
        'requirement_files',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Uuid(), nullable=True),
        sa.Column('parsed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_requirement_files_name', 'requirement_files', ['name'], unique=False)

    # Create services table
    op.create_table(
        'services',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('file_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('base_path', sa.String(length=255), nullable=False, server_default='/api'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['file_id'], ['requirement_files.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_services_file_id', 'services', ['file_id'], unique=False)

    # Create models table
    op.create_table(
        'models',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('file_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['file_id'], ['requirement_files.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_models_file_id', 'models', ['file_id'], unique=False)

    # Create entity_fields table
    op.create_table(
        'entity_fields',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('model_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('required', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['model_id'], ['models.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_entity_fields_model_id', 'entity_fields', ['model_id'], unique=False)

    # Create operations table
    op.create_table(
        'operations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('file_id', sa.Uuid(), nullable=False),
        sa.Column('service_id', sa.Uuid(), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('path', sa.String(length=255), nullable=False),
        sa.Column('summary', sa.String(length=255), nullable=True),
        sa.Column('request_model_id', sa.Uuid(), nullable=True),
        sa.Column('response_model_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['file_id'], ['requirement_files.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_operations_file_id', 'operations', ['file_id'], unique=False)
    op.create_index('ix_operations_service_id', 'operations', ['service_id'], unique=False)

    # Create errors table
    op.create_table(
        'errors',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('file_id', sa.Uuid(), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['file_id'], ['requirement_files.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_errors_file_id', 'errors', ['file_id'], unique=False)
    op.create_index('ix_errors_status_code', 'errors', ['status_code'], unique=False)


def downgrade() -> None:
    """Drop all tables in reverse order."""
    op.drop_index('ix_errors_status_code', table_name='errors')
    op.drop_index('ix_errors_file_id', table_name='errors')
    op.drop_table('errors')

    op.drop_index('ix_operations_service_id', table_name='operations')
    op.drop_index('ix_operations_file_id', table_name='operations')
    op.drop_table('operations')

    op.drop_index('ix_entity_fields_model_id', table_name='entity_fields')
    op.drop_table('entity_fields')

    op.drop_index('ix_models_file_id', table_name='models')
    op.drop_table('models')

    op.drop_index('ix_services_file_id', table_name='services')
    op.drop_table('services')

    op.drop_index('ix_requirement_files_name', table_name='requirement_files')
    op.drop_table('requirement_files')
