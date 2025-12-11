"""Shared pytest fixtures for API Architect backend tests."""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def api_url() -> str:
    """Base API URL for tests."""
    return "/api/v1"


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for testing the FastAPI app."""
    from src.api.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
