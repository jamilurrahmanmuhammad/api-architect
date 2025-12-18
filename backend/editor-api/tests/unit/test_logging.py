"""
Unit tests for Structured Logging.

Tests JSON formatting, request correlation, and log levels.
"""

import json
import logging
import pytest

from src.utils.logging import (
    JSONFormatter,
    StructuredLogger,
    setup_logging,
    get_logger,
    set_request_id,
    get_request_id,
    clear_request_id,
    request_id_var,
)


class TestJSONFormatter:
    """Test suite for JSONFormatter."""

    def test_format_basic_log_record(self):
        """Test basic log record formatting."""
        formatter = JSONFormatter(
            service_name="test-service",
            environment="testing",
            version="1.0.0",
        )

        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        output = formatter.format(record)
        data = json.loads(output)

        assert data["level"] == "INFO"
        assert data["logger"] == "test.logger"
        assert data["message"] == "Test message"
        assert data["service"] == "test-service"
        assert data["environment"] == "testing"
        assert data["version"] == "1.0.0"
        assert "timestamp" in data
        assert data["source"]["line"] == 42

    def test_format_includes_request_id(self):
        """Test that request ID is included when set."""
        formatter = JSONFormatter()

        # Set request ID
        set_request_id("test-request-123")

        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="Test",
            args=(),
            exc_info=None,
        )

        output = formatter.format(record)
        data = json.loads(output)

        assert data["request_id"] == "test-request-123"

        # Cleanup
        clear_request_id()

    def test_format_without_request_id(self):
        """Test formatting without request ID."""
        clear_request_id()  # Ensure no request ID
        formatter = JSONFormatter()

        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="Test",
            args=(),
            exc_info=None,
        )

        output = formatter.format(record)
        data = json.loads(output)

        assert "request_id" not in data

    def test_format_with_exception(self):
        """Test formatting with exception info."""
        formatter = JSONFormatter()

        try:
            raise ValueError("Test error")
        except ValueError:
            import sys
            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name="test.logger",
            level=logging.ERROR,
            pathname="",
            lineno=0,
            msg="Error occurred",
            args=(),
            exc_info=exc_info,
        )

        output = formatter.format(record)
        data = json.loads(output)

        assert "exception" in data
        assert "ValueError" in data["exception"]
        assert "Test error" in data["exception"]


class TestStructuredLogger:
    """Test suite for StructuredLogger."""

    def test_debug_level(self, caplog):
        """Test debug logging."""
        logger = StructuredLogger("test")
        logger.logger.setLevel(logging.DEBUG)

        with caplog.at_level(logging.DEBUG):
            logger.debug("Debug message", key="value")

        assert "Debug message" in caplog.text

    def test_info_level(self, caplog):
        """Test info logging."""
        logger = StructuredLogger("test")

        with caplog.at_level(logging.INFO):
            logger.info("Info message", count=42)

        assert "Info message" in caplog.text

    def test_warning_level(self, caplog):
        """Test warning logging."""
        logger = StructuredLogger("test")

        with caplog.at_level(logging.WARNING):
            logger.warning("Warning message")

        assert "Warning message" in caplog.text

    def test_error_level(self, caplog):
        """Test error logging."""
        logger = StructuredLogger("test")

        with caplog.at_level(logging.ERROR):
            logger.error("Error message", error_code=500)

        assert "Error message" in caplog.text

    def test_critical_level(self, caplog):
        """Test critical logging."""
        logger = StructuredLogger("test")

        with caplog.at_level(logging.CRITICAL):
            logger.critical("Critical message")

        assert "Critical message" in caplog.text


class TestRequestIdContext:
    """Test suite for request ID context management."""

    def test_set_and_get_request_id(self):
        """Test setting and getting request ID."""
        clear_request_id()  # Start clean

        assert get_request_id() is None

        set_request_id("test-id-123")
        assert get_request_id() == "test-id-123"

        clear_request_id()
        assert get_request_id() is None

    def test_request_id_isolation(self):
        """Test that request ID is isolated within context."""
        clear_request_id()

        set_request_id("id-1")
        assert get_request_id() == "id-1"

        # Update to new ID
        set_request_id("id-2")
        assert get_request_id() == "id-2"

        clear_request_id()


class TestSetupLogging:
    """Test suite for logging setup."""

    def test_setup_with_json_format(self):
        """Test setup with JSON formatting."""
        setup_logging(
            level="DEBUG",
            service_name="test-service",
            environment="testing",
            use_json=True,
        )

        root_logger = logging.getLogger()
        assert root_logger.level == logging.DEBUG
        assert len(root_logger.handlers) > 0

    def test_setup_with_simple_format(self):
        """Test setup with simple formatting."""
        setup_logging(
            level="INFO",
            use_json=False,
        )

        root_logger = logging.getLogger()
        assert root_logger.level == logging.INFO

    def test_setup_different_log_levels(self):
        """Test setup with different log levels."""
        for level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            setup_logging(level=level)
            root_logger = logging.getLogger()
            assert root_logger.level == getattr(logging, level)


class TestGetLogger:
    """Test suite for get_logger factory."""

    def test_get_logger_returns_structured_logger(self):
        """Test that get_logger returns StructuredLogger."""
        logger = get_logger("test.module")

        assert isinstance(logger, StructuredLogger)
        assert logger.logger.name == "test.module"

    def test_get_logger_same_name_same_logger(self):
        """Test that same name returns same underlying logger."""
        logger1 = get_logger("test.same")
        logger2 = get_logger("test.same")

        assert logger1.logger is logger2.logger
