"""
Unit tests for SQLAlchemy ORM models.

Tests cover:
- Model instantiation and persistence
- Field validations and constraints
- Relationships between entities
- UUID primary key generation on persist
- Timestamp auto-population on persist

TDD: These tests verify the ORM models created in T009-T010.

Note: SQLAlchemy defaults are applied at INSERT time, not on instantiation.
Tests verify behavior after persistence.
"""

import pytest
from datetime import datetime, UTC
from uuid import UUID

from src.models.file import (
    Base,
    RequirementFile,
    Service,
    Model,
    EntityField,
    Operation,
    Error,
)


class TestRequirementFile:
    """Tests for RequirementFile ORM model."""

    @pytest.mark.asyncio
    async def test_create_and_persist_with_defaults(self, db_session):
        """Test creating a RequirementFile with defaults applied after persist."""
        file = RequirementFile(name="test-api")

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(file)

        # Verify defaults are applied after persist
        assert file.name == "test-api"
        assert file.content == ""
        assert file.version == 1
        assert file.status == "draft"
        assert file.created_by is None
        assert file.parsed_at is None

    @pytest.mark.asyncio
    async def test_uuid_primary_key_generated_on_persist(self, db_session):
        """Test that UUID primary key is generated on persist."""
        file = RequirementFile(name="test-api")

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(file)

        assert file.id is not None
        # SQLAlchemy Uuid returns UUID object
        assert isinstance(file.id, (UUID, str))

    @pytest.mark.asyncio
    async def test_timestamps_populated_on_persist(self, db_session):
        """Test that created_at and updated_at are populated on persist."""
        file = RequirementFile(name="test-api")

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(file)

        assert file.created_at is not None
        assert file.updated_at is not None
        assert isinstance(file.created_at, datetime)
        assert isinstance(file.updated_at, datetime)

    @pytest.mark.asyncio
    async def test_persist_and_retrieve(self, db_session):
        """Test persisting a RequirementFile and retrieving it."""
        file = RequirementFile(
            name="petstore-api",
            content="service: petstore\n  title: Pet Store API",
            status="draft"
        )

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(file)

        # Verify persisted
        assert file.id is not None
        assert file.name == "petstore-api"
        assert file.version == 1

    @pytest.mark.asyncio
    async def test_relationship_with_services(self, db_session):
        """Test RequirementFile -> Service relationship."""
        file = RequirementFile(name="test-api", content="")
        service = Service(
            name="petstore",
            title="Petstore API",
            version="1.0.0",
            base_path="/api/v1"
        )
        file.services.append(service)

        db_session.add(file)
        await db_session.commit()

        # Explicitly load the relationship
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        result = await db_session.execute(
            select(RequirementFile)
            .where(RequirementFile.id == file.id)
            .options(selectinload(RequirementFile.services))
        )
        loaded_file = result.scalar_one()

        assert len(loaded_file.services) == 1
        assert loaded_file.services[0].name == "petstore"
        assert loaded_file.services[0].file_id == file.id

    @pytest.mark.asyncio
    async def test_cascade_delete_services(self, db_session):
        """Test that deleting a file cascades to services."""
        file = RequirementFile(name="test-api", content="")
        service = Service(name="svc", version="1.0.0", base_path="/api")
        file.services.append(service)

        db_session.add(file)
        await db_session.commit()

        service_id = service.id

        # Delete the file
        await db_session.delete(file)
        await db_session.commit()

        # Service should be deleted too (cascade)
        from sqlalchemy import select
        result = await db_session.execute(
            select(Service).where(Service.id == service_id)
        )
        assert result.scalar_one_or_none() is None

    def test_repr(self):
        """Test string representation."""
        file = RequirementFile(name="test-api")
        repr_str = repr(file)

        assert "RequirementFile" in repr_str
        assert "test-api" in repr_str


class TestService:
    """Tests for Service ORM model."""

    @pytest.mark.asyncio
    async def test_create_and_persist_with_defaults(self, db_session):
        """Test creating a Service with defaults applied after persist."""
        file = RequirementFile(name="test-api", content="")
        service = Service(name="petstore")
        file.services.append(service)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(service)

        assert service.name == "petstore"
        assert service.version == "1.0.0"
        assert service.base_path == "/api"
        assert service.title is None
        assert service.description is None

    @pytest.mark.asyncio
    async def test_uuid_primary_key_generated_on_persist(self, db_session):
        """Test that UUID primary key is generated on persist."""
        file = RequirementFile(name="test-api", content="")
        service = Service(name="test-service")
        file.services.append(service)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(service)

        assert service.id is not None
        assert isinstance(service.id, (UUID, str))

    @pytest.mark.asyncio
    async def test_relationship_with_operations(self, db_session):
        """Test Service -> Operation relationship."""
        file = RequirementFile(name="test-api", content="")
        service = Service(name="petstore", version="1.0.0", base_path="/api")
        file.services.append(service)

        operation = Operation(
            method="GET",
            path="/pets",
            summary="List all pets"
        )
        operation.file = file
        service.operations.append(operation)

        db_session.add(file)
        await db_session.commit()

        # Explicitly load the relationship
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        result = await db_session.execute(
            select(Service)
            .where(Service.id == service.id)
            .options(selectinload(Service.operations))
        )
        loaded_service = result.scalar_one()

        assert len(loaded_service.operations) == 1
        assert loaded_service.operations[0].method == "GET"
        assert loaded_service.operations[0].path == "/pets"

    def test_repr(self):
        """Test string representation."""
        service = Service(name="petstore", version="2.0.0")
        repr_str = repr(service)

        assert "Service" in repr_str
        assert "petstore" in repr_str
        assert "2.0.0" in repr_str


class TestModel:
    """Tests for Model (data structure) ORM model."""

    def test_instantiation(self):
        """Test creating a Model instance."""
        model = Model(name="Pet")

        assert model.name == "Pet"
        assert model.description is None

    @pytest.mark.asyncio
    async def test_uuid_primary_key_generated_on_persist(self, db_session):
        """Test that UUID primary key is generated on persist."""
        file = RequirementFile(name="test-api", content="")
        model = Model(name="Pet")
        file.models.append(model)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(model)

        assert model.id is not None
        assert isinstance(model.id, (UUID, str))

    @pytest.mark.asyncio
    async def test_relationship_with_fields(self, db_session):
        """Test Model -> EntityField relationship."""
        file = RequirementFile(name="test-api", content="")
        model = Model(name="Pet", description="A pet in the store")
        file.models.append(model)

        field1 = EntityField(name="id", type="integer", required=True)
        field2 = EntityField(name="name", type="string", required=True)
        field3 = EntityField(name="tag", type="string", required=False)

        model.fields.extend([field1, field2, field3])

        db_session.add(file)
        await db_session.commit()

        # Explicitly load the relationship
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        result = await db_session.execute(
            select(Model)
            .where(Model.id == model.id)
            .options(selectinload(Model.fields))
        )
        loaded_model = result.scalar_one()

        assert len(loaded_model.fields) == 3
        field_names = [f.name for f in loaded_model.fields]
        assert "id" in field_names
        assert "name" in field_names
        assert "tag" in field_names

    @pytest.mark.asyncio
    async def test_cascade_delete_fields(self, db_session):
        """Test that deleting a model cascades to fields."""
        file = RequirementFile(name="test-api", content="")
        model = Model(name="Pet")
        file.models.append(model)

        field = EntityField(name="id", type="integer", required=True)
        model.fields.append(field)

        db_session.add(file)
        await db_session.commit()

        field_id = field.id

        # Delete the file (cascades to model, then to fields)
        await db_session.delete(file)
        await db_session.commit()

        # Field should be deleted too (cascade)
        from sqlalchemy import select
        result = await db_session.execute(
            select(EntityField).where(EntityField.id == field_id)
        )
        assert result.scalar_one_or_none() is None

    def test_repr(self):
        """Test string representation."""
        model = Model(name="Pet")
        repr_str = repr(model)

        assert "Model" in repr_str
        assert "Pet" in repr_str


class TestEntityField:
    """Tests for EntityField ORM model."""

    @pytest.mark.asyncio
    async def test_create_and_persist_with_defaults(self, db_session):
        """Test creating an EntityField with defaults after persist."""
        file = RequirementFile(name="test-api", content="")
        model = Model(name="Pet")
        file.models.append(model)
        field = EntityField(name="id", type="integer")
        model.fields.append(field)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(field)

        assert field.name == "id"
        assert field.type == "integer"
        assert field.required is True  # Default
        assert field.description is None

    @pytest.mark.asyncio
    async def test_required_default_true_after_persist(self, db_session):
        """Test that required defaults to True after persist."""
        file = RequirementFile(name="test-api", content="")
        model = Model(name="Pet")
        file.models.append(model)
        field = EntityField(name="name", type="string")
        model.fields.append(field)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(field)

        assert field.required is True

    def test_required_can_be_false(self):
        """Test that required can be set to False."""
        field = EntityField(name="tag", type="string", required=False)
        assert field.required is False

    @pytest.mark.asyncio
    async def test_uuid_primary_key_generated_on_persist(self, db_session):
        """Test that UUID primary key is generated on persist."""
        file = RequirementFile(name="test-api", content="")
        model = Model(name="Pet")
        file.models.append(model)
        field = EntityField(name="id", type="integer")
        model.fields.append(field)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(field)

        assert field.id is not None
        assert isinstance(field.id, (UUID, str))

    def test_repr(self):
        """Test string representation."""
        field = EntityField(name="email", type="string")
        repr_str = repr(field)

        assert "EntityField" in repr_str
        assert "email" in repr_str
        assert "string" in repr_str


class TestOperation:
    """Tests for Operation ORM model."""

    def test_create_with_required_fields(self):
        """Test creating an Operation with required fields."""
        operation = Operation(method="GET", path="/pets")

        assert operation.method == "GET"
        assert operation.path == "/pets"
        assert operation.summary is None
        assert operation.request_model_id is None
        assert operation.response_model_id is None

    @pytest.mark.asyncio
    async def test_uuid_primary_key_generated_on_persist(self, db_session):
        """Test that UUID primary key is generated on persist."""
        file = RequirementFile(name="test-api", content="")
        service = Service(name="petstore", version="1.0.0", base_path="/api")
        file.services.append(service)
        operation = Operation(method="POST", path="/pets")
        operation.file = file
        service.operations.append(operation)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(operation)

        assert operation.id is not None
        assert isinstance(operation.id, (UUID, str))

    def test_all_http_methods(self):
        """Test that all HTTP methods are supported."""
        methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]

        for method in methods:
            operation = Operation(method=method, path="/test")
            assert operation.method == method

    @pytest.mark.asyncio
    async def test_belongs_to_file_and_service(self, db_session):
        """Test Operation belongs to both File and Service."""
        file = RequirementFile(name="test-api", content="")
        service = Service(name="petstore", version="1.0.0", base_path="/api")
        file.services.append(service)

        operation = Operation(
            method="GET",
            path="/pets/{id}",
            summary="Get pet by ID"
        )
        operation.file = file
        operation.service = service

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(operation)

        assert operation.file_id == file.id
        assert operation.service_id == service.id

    def test_repr(self):
        """Test string representation."""
        operation = Operation(method="DELETE", path="/pets/{id}")
        repr_str = repr(operation)

        assert "Operation" in repr_str
        assert "DELETE" in repr_str
        assert "/pets/{id}" in repr_str


class TestError:
    """Tests for Error ORM model."""

    def test_create_with_required_fields(self):
        """Test creating an Error with required fields."""
        error = Error(status_code=404, name="NotFound")

        assert error.status_code == 404
        assert error.name == "NotFound"
        assert error.description is None

    @pytest.mark.asyncio
    async def test_uuid_primary_key_generated_on_persist(self, db_session):
        """Test that UUID primary key is generated on persist."""
        file = RequirementFile(name="test-api", content="")
        error = Error(status_code=500, name="InternalError")
        file.file_errors.append(error)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(error)

        assert error.id is not None
        assert isinstance(error.id, (UUID, str))

    def test_common_status_codes(self):
        """Test common HTTP status codes."""
        status_codes = [400, 401, 403, 404, 409, 422, 500, 502, 503]

        for code in status_codes:
            error = Error(status_code=code, name=f"Error{code}")
            assert error.status_code == code

    @pytest.mark.asyncio
    async def test_belongs_to_file(self, db_session):
        """Test Error belongs to a RequirementFile."""
        file = RequirementFile(name="test-api", content="")
        error = Error(
            status_code=404,
            name="PetNotFound",
            description="The requested pet was not found"
        )
        file.file_errors.append(error)

        db_session.add(file)
        await db_session.commit()
        await db_session.refresh(error)

        assert error.file_id == file.id

    def test_repr(self):
        """Test string representation."""
        error = Error(status_code=404, name="NotFound")
        repr_str = repr(error)

        assert "Error" in repr_str
        assert "404" in repr_str
        assert "NotFound" in repr_str


class TestBaseClass:
    """Tests for the SQLAlchemy Base class."""

    def test_base_is_declarative_base(self):
        """Test that Base is a proper DeclarativeBase."""
        from sqlalchemy.orm import DeclarativeBase

        assert issubclass(Base, DeclarativeBase)

    def test_all_models_inherit_from_base(self):
        """Test that all models inherit from Base."""
        models = [RequirementFile, Service, Model, EntityField, Operation, Error]

        for model in models:
            assert issubclass(model, Base)

    def test_all_models_have_tablename(self):
        """Test that all models have __tablename__ defined."""
        expected = {
            RequirementFile: "requirement_files",
            Service: "services",
            Model: "models",
            EntityField: "entity_fields",
            Operation: "operations",
            Error: "errors",
        }

        for model, tablename in expected.items():
            assert model.__tablename__ == tablename
