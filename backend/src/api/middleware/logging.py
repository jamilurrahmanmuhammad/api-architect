"""Structured logging middleware with correlation IDs.

T018: GREEN - Implement structured logging middleware with correlation IDs.
"""

import time
from collections.abc import Callable
from uuid import uuid4

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for structured logging with correlation IDs."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Response]
    ) -> Response:
        """Process request with logging and correlation ID."""
        # Generate or extract correlation ID
        request_id = request.headers.get("X-Request-ID", str(uuid4()))

        # Bind request ID to structlog context
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        # Log request start
        start_time = time.perf_counter()
        await logger.ainfo(
            "request_started",
            method=request.method,
            path=request.url.path,
            query=str(request.url.query),
        )

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Log request completion
        await logger.ainfo(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response
