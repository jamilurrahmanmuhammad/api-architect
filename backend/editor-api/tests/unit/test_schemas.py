"""
Unit tests for Pydantic schemas.

Tests:
- Request validation
- Response serialization
- Error handling
"""

import pytest
from datetime import datetime
from uuid import uuid4

from src.models.schemas import (
    RequirementFileCreateRequest,
    RequirementFileResponse,
    ParseError,
    ParsedService,
    ValidateResponse,
)


class TestRequirementFileCreateRequest:
    """Test file creation request validation."""

    def test_valid_create_request(self):
        """Test valid file creation request."""
        req = RequirementFileCreateRequest(
            name="api-spec",
            content="## Service\nname: petstore",
        )
        assert req.name == "api-spec"
        assert req.content == "## Service\nname: petstore"

    def test_create_request_with_empty_content(self):
        """Test file creation with empty content (allowed)."""
        req = RequirementFileCreateRequest(
            name="new-file",
            content="",  # Empty is valid
        )
        assert req.name == "new-file"
        assert req.content == ""

    def test_create_request_name_required(self):
        """Test that name is required."""
        with pytest.raises(ValueError):
            RequirementFileCreateRequest(content="test")

    def test_create_request_name_min_length(self):
        """Test name minimum length validation."""
        with pytest.raises(ValueError):
            RequirementFileCreateRequest(
                name="",  # Empty name not allowed
                content="test",
            )

    def test_create_request_name_max_length(self):
        """Test name maximum length validation."""
        with pytest.raises(ValueError):
            RequirementFileCreateRequest(
                name="x" * 256,  # Exceeds 255 character limit
                content="test",
            )


class TestRequirementFileResponse:
    """Test file response serialization."""

    def test_valid_response(self):
        """Test valid file response."""
        file_id = uuid4()
        now = datetime.utcnow()

        resp = RequirementFileResponse(
            id=file_id,
            name="test-file",
            content="## Service\nname: test",
            version=1,
            status="draft",
            created_at=now,
            updated_at=now,
        )

        assert resp.id == file_id
        assert resp.name == "test-file"
        assert resp.version == 1
        assert resp.status == "draft"

    def test_response_status_values(self):
        """Test valid status values."""
        file_id = uuid4()
        now = datetime.utcnow()

        for status in ["draft", "reviewing", "approved", "published"]:
            resp = RequirementFileResponse(
                id=file_id,
                name="test",
                content="test",
                version=1,
                status=status,
                created_at=now,
                updated_at=now,
            )
            assert resp.status == status

    def test_response_with_optional_created_by(self):
        """Test optional created_by field."""
        file_id = uuid4()
        now = datetime.utcnow()
        creator_id = uuid4()

        resp = RequirementFileResponse(
            id=file_id,
            name="test",
            content="test",
            version=1,
            status="draft",
            created_at=now,
            updated_at=now,
            created_by=creator_id,
        )

        assert resp.created_by == creator_id


class TestParseError:
    """Test parse error model."""

    def test_valid_parse_error(self):
        """Test valid parse error."""
        err = ParseError(
            line=5,
            column=1,
            error_type="MISSING_HEADER",
            message="Expected '## Service' header",
            guidance="Add '## Service' before service definition",
        )

        assert err.line == 5
        assert err.column == 1
        assert err.error_type == "MISSING_HEADER"
        assert err.message == "Expected '## Service' header"

    def test_parse_error_guidance_optional(self):
        """Test that guidance is optional."""
        err = ParseError(
            line=5,
            column=1,
            error_type="INVALID_SYNTAX",
            message="Syntax error",
        )

        assert err.guidance is None


class TestParsedService:
    """Test parsed service model."""

    def test_valid_parsed_service(self):
        """Test valid parsed service."""
        service = ParsedService(
            id="petstore",
            name="Petstore API",
            title="Petstore",
            description="Pet store API",
            version="1.0.0",
            base_path="/api/v1",
        )

        assert service.id == "petstore"
        assert service.name == "Petstore API"
        assert service.title == "Petstore"


class TestValidateResponse:
    """Test validation response model."""

    def test_valid_validation_response(self):
        """Test valid validation response with no errors."""
        resp = ValidateResponse(
            valid=True,
            errors=[],
            warnings=[],
        )

        assert resp.valid is True
        assert len(resp.errors) == 0

    def test_validation_response_with_errors(self):
        """Test validation response with errors."""
        error = ParseError(
            line=5,
            column=1,
            error_type="MISSING_HEADER",
            message="Missing header",
        )

        resp = ValidateResponse(
            valid=False,
            errors=[error],
            warnings=[],
        )

        assert resp.valid is False
        assert len(resp.errors) == 1
        assert resp.errors[0].line == 5

    def test_validation_response_with_warnings(self):
        """Test validation response with warnings."""
        warning = ParseError(
            line=10,
            column=5,
            error_type="DEPRECATED_SYNTAX",
            message="This syntax is deprecated",
        )

        resp = ValidateResponse(
            valid=True,
            errors=[],
            warnings=[warning],
        )

        assert resp.valid is True
        assert len(resp.warnings) == 1
