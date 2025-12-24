"""
Structured Logging Configuration for API Architect Editor API.

Provides JSON-formatted logging for observability with:
- Request correlation IDs
- Structured fields (service, environment, version)
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Integration with uvicorn and FastAPI
"""

import json
import logging
import os
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any, Optional

# Context variable for request correlation ID
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class JSONFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging.

    Outputs log records as JSON objects with standardized fields.
    """

    def __init__(
        self,
        service_name: str = "api-architect-editor-api",
        environment: str = "development",
        version: str = "0.1.0",
    ):
        """
        Initialize JSON formatter.

        Args:
            service_name: Name of the service for log identification
            environment: Deployment environment (development, staging, production)
            version: Application version
        """
        super().__init__()
        self.service_name = service_name
        self.environment = environment
        self.version = version

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON.

        Args:
            record: Log record to format

        Returns:
            JSON string representation of log record
        """
        log_data = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
            "environment": self.environment,
            "version": self.version,
        }

        # Add request ID if available
        request_id = request_id_var.get()
        if request_id:
            log_data["request_id"] = request_id

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        if hasattr(record, "extra"):
            log_data["extra"] = record.extra

        # Add source location for debugging
        log_data["source"] = {
            "file": record.pathname,
            "line": record.lineno,
            "function": record.funcName,
        }

        return json.dumps(log_data, default=str)


class StructuredLogger:
    """
    Wrapper for structured logging with extra context.

    Provides methods for logging with additional structured fields.
    """

    def __init__(self, name: str):
        """
        Initialize structured logger.

        Args:
            name: Logger name (typically module name)
        """
        self.logger = logging.getLogger(name)

    def _log(self, level: int, message: str, **extra: Any) -> None:
        """
        Internal logging method with extra context.

        Args:
            level: Log level
            message: Log message
            **extra: Additional structured fields
        """
        record = self.logger.makeRecord(
            self.logger.name,
            level,
            "",
            0,
            message,
            (),
            None,
        )
        record.extra = extra
        self.logger.handle(record)

    def debug(self, message: str, **extra: Any) -> None:
        """Log debug message with extra context."""
        self._log(logging.DEBUG, message, **extra)

    def info(self, message: str, **extra: Any) -> None:
        """Log info message with extra context."""
        self._log(logging.INFO, message, **extra)

    def warning(self, message: str, **extra: Any) -> None:
        """Log warning message with extra context."""
        self._log(logging.WARNING, message, **extra)

    def error(self, message: str, **extra: Any) -> None:
        """Log error message with extra context."""
        self._log(logging.ERROR, message, **extra)

    def critical(self, message: str, **extra: Any) -> None:
        """Log critical message with extra context."""
        self._log(logging.CRITICAL, message, **extra)


def setup_logging(
    level: str = "INFO",
    service_name: str = "api-architect-editor-api",
    environment: Optional[str] = None,
    version: str = "0.1.0",
    use_json: bool = True,
) -> None:
    """
    Configure application logging.

    Sets up handlers, formatters, and log levels for the application.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        service_name: Name of the service for log identification
        environment: Deployment environment (auto-detected if None)
        version: Application version
        use_json: Whether to use JSON formatting (True for production)
    """
    # Auto-detect environment from ENV variable
    if environment is None:
        environment = os.getenv("ENVIRONMENT", "development")

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    root_logger.handlers.clear()

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Set formatter based on configuration
    if use_json:
        formatter = JSONFormatter(
            service_name=service_name,
            environment=environment,
            version=version,
        )
    else:
        # Simple format for local development
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Configure uvicorn access logs
    uvicorn_access = logging.getLogger("uvicorn.access")
    uvicorn_access.handlers.clear()
    uvicorn_access.addHandler(console_handler)

    # Configure uvicorn error logs
    uvicorn_error = logging.getLogger("uvicorn.error")
    uvicorn_error.handlers.clear()
    uvicorn_error.addHandler(console_handler)

    # Suppress overly verbose loggers
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> StructuredLogger:
    """
    Get a structured logger by name.

    Args:
        name: Logger name (typically __name__)

    Returns:
        StructuredLogger instance
    """
    return StructuredLogger(name)


def set_request_id(request_id: str) -> None:
    """
    Set the current request ID for correlation.

    Args:
        request_id: Unique request identifier
    """
    request_id_var.set(request_id)


def get_request_id() -> Optional[str]:
    """
    Get the current request ID.

    Returns:
        Current request ID or None if not set
    """
    return request_id_var.get()


def clear_request_id() -> None:
    """Clear the current request ID."""
    request_id_var.set(None)
