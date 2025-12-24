"""
Integration tests for health check endpoint.

Tests:
- Server startup and health status
- Response format
"""

import pytest
from fastapi.testclient import TestClient

from src.main import app


def test_health_check():
    """Test health check endpoint."""
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_root_endpoint():
    """Test root endpoint returns API info."""
    client = TestClient(app)
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    # Root endpoint should return some data
    assert isinstance(data, dict)


def test_api_docs_available():
    """Test API documentation is available."""
    client = TestClient(app)
    response = client.get("/api/docs")

    # OpenAPI docs should be available
    assert response.status_code == 200


def test_invalid_endpoint_returns_404():
    """Test that invalid endpoints return 404."""
    client = TestClient(app)
    response = client.get("/invalid/endpoint")

    assert response.status_code == 404
