"""Global error handler middleware.

T019: GREEN - Implement global error handler middleware.
"""

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.models.api import ApiError, ApiErrorResponse

logger = structlog.get_logger()


def setup_exception_handlers(app: FastAPI) -> None:
    """Configure global exception handlers for the FastAPI app."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        """Handle HTTP exceptions with standard error envelope."""
        await logger.awarning(
            "http_exception",
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
        )

        # Check if detail contains a pre-formatted error structure
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            return JSONResponse(
                status_code=exc.status_code,
                content=exc.detail,
            )

        error_response = ApiErrorResponse(
            error=ApiError(
                code=_status_to_code(exc.status_code),
                message=str(exc.detail),
            )
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=error_response.model_dump(by_alias=True, mode="json"),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle unexpected exceptions with standard error envelope."""
        await logger.aerror(
            "unhandled_exception",
            error=str(exc),
            error_type=type(exc).__name__,
            path=request.url.path,
        )

        error_response = ApiErrorResponse(
            error=ApiError(
                code="INTERNAL_ERROR",
                message="An unexpected error occurred",
            )
        )

        return JSONResponse(
            status_code=500,
            content=error_response.model_dump(by_alias=True, mode="json"),
        )


def _status_to_code(status_code: int) -> str:
    """Convert HTTP status code to error code string."""
    status_codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
    }
    return status_codes.get(status_code, f"HTTP_{status_code}")
