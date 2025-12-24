"""
Error Handling Middleware for API Architect Editor API.

Provides centralized error handling with:
- Proper HTTP status codes
- Structured error responses
- Request correlation IDs
- Error logging
"""

import traceback
from typing import Callable
from uuid import uuid4

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from src.services.file_service import (
    FileNotFoundError,
    FileNameExistsError,
    FileValidationError,
    FileServiceError,
)
from src.utils.logging import get_logger, set_request_id, clear_request_id

logger = get_logger(__name__)


# =============================================================================
# Error Response Model
# =============================================================================


def create_error_response(
    status_code: int,
    error: str,
    detail: str,
    request_id: str,
    path: str = "",
) -> JSONResponse:
    """
    Create a standardized error response.

    Args:
        status_code: HTTP status code
        error: Error type/category
        detail: Human-readable error message
        request_id: Request correlation ID
        path: Request path (optional)

    Returns:
        JSONResponse with error details
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error,
            "detail": detail,
            "request_id": request_id,
            "path": path,
        },
    )


# =============================================================================
# Request ID Middleware
# =============================================================================


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add request correlation IDs.

    Generates or extracts request ID for correlation across services.
    """

    async def dispatch(self, request: Request, call_next: Callable):
        """Process request with correlation ID."""
        # Get or generate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid4()))

        # Set in context for logging
        set_request_id(request_id)

        # Store in request state for error handlers
        request.state.request_id = request_id

        try:
            response = await call_next(request)
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            clear_request_id()


# =============================================================================
# Exception Handlers
# =============================================================================


async def file_not_found_handler(request: Request, exc: FileNotFoundError):
    """Handle FileNotFoundError exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.warning(
        f"File not found: {exc.identifier}",
        error_type="FileNotFoundError",
        identifier=exc.identifier,
        by=exc.by,
        request_id=request_id,
    )

    return create_error_response(
        status_code=status.HTTP_404_NOT_FOUND,
        error="NotFound",
        detail=str(exc),
        request_id=request_id,
        path=str(request.url.path),
    )


async def file_name_exists_handler(request: Request, exc: FileNameExistsError):
    """Handle FileNameExistsError exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.warning(
        f"File name already exists: {exc.name}",
        error_type="FileNameExistsError",
        name=exc.name,
        request_id=request_id,
    )

    return create_error_response(
        status_code=status.HTTP_409_CONFLICT,
        error="Conflict",
        detail=str(exc),
        request_id=request_id,
        path=str(request.url.path),
    )


async def file_validation_handler(request: Request, exc: FileValidationError):
    """Handle FileValidationError exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.warning(
        f"Validation error: {exc.field} - {exc.message}",
        error_type="FileValidationError",
        field=exc.field,
        validation_message=exc.message,
        request_id=request_id,
    )

    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error="ValidationError",
        detail=str(exc),
        request_id=request_id,
        path=str(request.url.path),
    )


async def file_service_handler(request: Request, exc: FileServiceError):
    """Handle generic FileServiceError exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.error(
        f"File service error: {exc}",
        error_type="FileServiceError",
        request_id=request_id,
    )

    return create_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        error="BadRequest",
        detail=str(exc),
        request_id=request_id,
        path=str(request.url.path),
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    # Log full stack trace for debugging
    logger.error(
        f"Unhandled exception: {exc}",
        error_type=type(exc).__name__,
        traceback=traceback.format_exc(),
        request_id=request_id,
        path=str(request.url.path),
    )

    # Return generic error message (don't expose internals)
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error="InternalServerError",
        detail="An unexpected error occurred. Please try again later.",
        request_id=request_id,
        path=str(request.url.path),
    )


# =============================================================================
# Setup Function
# =============================================================================


def setup_error_handlers(app: FastAPI) -> None:
    """
    Register exception handlers with FastAPI application.

    Args:
        app: FastAPI application instance
    """
    # Add request ID middleware
    app.add_middleware(RequestIdMiddleware)

    # Register specific exception handlers
    app.add_exception_handler(FileNotFoundError, file_not_found_handler)
    app.add_exception_handler(FileNameExistsError, file_name_exists_handler)
    app.add_exception_handler(FileValidationError, file_validation_handler)
    app.add_exception_handler(FileServiceError, file_service_handler)

    # Register generic exception handler (catch-all)
    app.add_exception_handler(Exception, generic_exception_handler)
