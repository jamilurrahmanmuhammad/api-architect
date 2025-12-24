"""
Unit tests for Error Handling Middleware.

Tests exception handlers and error response formatting.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from src.middleware.error_handler import (
    create_error_response,
    file_not_found_handler,
    file_name_exists_handler,
    file_validation_handler,
    file_service_handler,
    generic_exception_handler,
    setup_error_handlers,
    RequestIdMiddleware,
)
from src.services.file_service import (
    FileNotFoundError,
    FileNameExistsError,
    FileValidationError,
    FileServiceError,
)


class TestCreateErrorResponse:
    """Test suite for error response creation."""

    def test_creates_json_response(self):
        """Test error response is JSONResponse."""
        response = create_error_response(
            status_code=404,
            error="NotFound",
            detail="Resource not found",
            request_id="test-123",
            path="/api/test",
        )

        assert response.status_code == 404
        assert response.media_type == "application/json"

    def test_response_contains_all_fields(self):
        """Test response body contains all expected fields."""
        response = create_error_response(
            status_code=400,
            error="BadRequest",
            detail="Invalid input",
            request_id="req-456",
            path="/api/resource",
        )

        body = response.body.decode()
        import json
        data = json.loads(body)

        assert data["error"] == "BadRequest"
        assert data["detail"] == "Invalid input"
        assert data["request_id"] == "req-456"
        assert data["path"] == "/api/resource"


class TestExceptionHandlers:
    """Test suite for specific exception handlers."""

    def _make_request(self) -> MagicMock:
        """Create a mock request with state."""
        request = MagicMock(spec=Request)
        request.state = MagicMock()
        request.state.request_id = "test-request-id"
        request.url = MagicMock()
        request.url.path = "/api/test"
        return request

    @pytest.mark.asyncio
    async def test_file_not_found_handler(self):
        """Test FileNotFoundError handler returns 404."""
        request = self._make_request()
        exc = FileNotFoundError("test-id-123", by="id")

        response = await file_not_found_handler(request, exc)

        assert response.status_code == 404
        import json
        data = json.loads(response.body.decode())
        assert data["error"] == "NotFound"
        assert "test-id-123" in data["detail"]

    @pytest.mark.asyncio
    async def test_file_name_exists_handler(self):
        """Test FileNameExistsError handler returns 409."""
        request = self._make_request()
        exc = FileNameExistsError("duplicate-name")

        response = await file_name_exists_handler(request, exc)

        assert response.status_code == 409
        import json
        data = json.loads(response.body.decode())
        assert data["error"] == "Conflict"
        assert "duplicate-name" in data["detail"]

    @pytest.mark.asyncio
    async def test_file_validation_handler(self):
        """Test FileValidationError handler returns 422."""
        request = self._make_request()
        exc = FileValidationError("name", "Name cannot be empty")

        response = await file_validation_handler(request, exc)

        assert response.status_code == 422
        import json
        data = json.loads(response.body.decode())
        assert data["error"] == "ValidationError"
        assert "name" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_file_service_handler(self):
        """Test generic FileServiceError handler returns 400."""
        request = self._make_request()
        exc = FileServiceError("Something went wrong")

        response = await file_service_handler(request, exc)

        assert response.status_code == 400
        import json
        data = json.loads(response.body.decode())
        assert data["error"] == "BadRequest"

    @pytest.mark.asyncio
    async def test_generic_exception_handler(self):
        """Test generic exception handler returns 500."""
        request = self._make_request()
        exc = RuntimeError("Unexpected error")

        response = await generic_exception_handler(request, exc)

        assert response.status_code == 500
        import json
        data = json.loads(response.body.decode())
        assert data["error"] == "InternalServerError"
        # Should not expose internal error details
        assert "Unexpected error" not in data["detail"]
        assert "unexpected error" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_handler_includes_request_id(self):
        """Test handlers include request ID in response."""
        request = self._make_request()
        request.state.request_id = "custom-request-id"
        exc = FileNotFoundError("test", by="id")

        response = await file_not_found_handler(request, exc)

        import json
        data = json.loads(response.body.decode())
        assert data["request_id"] == "custom-request-id"


class TestRequestIdMiddleware:
    """Test suite for RequestIdMiddleware."""

    def test_generates_request_id(self):
        """Test middleware generates request ID."""
        app = FastAPI()
        app.add_middleware(RequestIdMiddleware)

        @app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        client = TestClient(app)
        response = client.get("/test")

        assert "X-Request-ID" in response.headers
        # Should be a valid UUID
        request_id = response.headers["X-Request-ID"]
        assert len(request_id) == 36  # UUID format

    def test_preserves_provided_request_id(self):
        """Test middleware preserves X-Request-ID header if provided."""
        app = FastAPI()
        app.add_middleware(RequestIdMiddleware)

        @app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        client = TestClient(app)
        response = client.get(
            "/test",
            headers={"X-Request-ID": "provided-request-id"}
        )

        assert response.headers["X-Request-ID"] == "provided-request-id"


class TestSetupErrorHandlers:
    """Test suite for setup_error_handlers function."""

    def test_registers_middleware(self):
        """Test middleware is registered."""
        app = FastAPI()
        setup_error_handlers(app)

        # Check that middleware stack includes our middleware
        middleware_classes = [m.cls for m in app.user_middleware]
        assert RequestIdMiddleware in middleware_classes

    def test_registers_exception_handlers(self):
        """Test exception handlers are registered."""
        app = FastAPI()
        setup_error_handlers(app)

        # Check handlers are registered
        assert FileNotFoundError in app.exception_handlers
        assert FileNameExistsError in app.exception_handlers
        assert FileValidationError in app.exception_handlers
        assert FileServiceError in app.exception_handlers
        assert Exception in app.exception_handlers


class TestIntegrationErrorHandling:
    """Integration tests for error handling in FastAPI app."""

    @pytest.fixture
    def app_with_error_handling(self):
        """Create FastAPI app with error handling configured."""
        app = FastAPI()
        setup_error_handlers(app)

        @app.get("/not-found")
        async def raise_not_found():
            raise FileNotFoundError("test-id", by="id")

        @app.get("/conflict")
        async def raise_conflict():
            raise FileNameExistsError("duplicate")

        @app.get("/validation")
        async def raise_validation():
            raise FileValidationError("field", "Invalid value")

        @app.get("/internal")
        async def raise_internal():
            raise RuntimeError("Internal error")

        return app

    def test_not_found_error_handling(self, app_with_error_handling):
        """Test 404 error handling end-to-end."""
        client = TestClient(app_with_error_handling, raise_server_exceptions=False)
        response = client.get("/not-found")

        assert response.status_code == 404
        assert response.json()["error"] == "NotFound"

    def test_conflict_error_handling(self, app_with_error_handling):
        """Test 409 error handling end-to-end."""
        client = TestClient(app_with_error_handling, raise_server_exceptions=False)
        response = client.get("/conflict")

        assert response.status_code == 409
        assert response.json()["error"] == "Conflict"

    def test_validation_error_handling(self, app_with_error_handling):
        """Test 422 error handling end-to-end."""
        client = TestClient(app_with_error_handling, raise_server_exceptions=False)
        response = client.get("/validation")

        assert response.status_code == 422
        assert response.json()["error"] == "ValidationError"

    def test_internal_error_handling(self, app_with_error_handling):
        """Test 500 error handling end-to-end."""
        client = TestClient(app_with_error_handling, raise_server_exceptions=False)
        response = client.get("/internal")

        assert response.status_code == 500
        assert response.json()["error"] == "InternalServerError"
        # Internal details should not leak
        assert "Internal error" not in response.json()["detail"]
