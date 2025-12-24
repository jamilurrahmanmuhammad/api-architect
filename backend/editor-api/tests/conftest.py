"""
Pytest configuration and fixtures for backend tests.

Provides:
- AsyncIO event loop for async tests
- Test database setup and teardown
- FastAPI test client with database override
- Mock authentication
"""

import asyncio
import os
from typing import AsyncGenerator

import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.db.database import get_db


# Use in-memory SQLite for tests (fast, isolated)
# Note: Production uses PostgreSQL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Global test engine and session factory
_test_engine = None
_test_session_factory = None


async def _setup_test_db():
    """Initialize test database engine and create tables."""
    global _test_engine, _test_session_factory

    _test_engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create tables
    async with _test_engine.begin() as conn:
        from src.models.file import Base
        await conn.run_sync(Base.metadata.create_all)

    _test_session_factory = async_sessionmaker(
        _test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def _get_test_db() -> AsyncGenerator[AsyncSession, None]:
    """Test database session dependency override."""
    global _test_session_factory

    if _test_session_factory is None:
        await _setup_test_db()

    async with _test_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


# Override database dependency for all tests
app.dependency_overrides[get_db] = _get_test_db


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Setup test database once per test session."""
    await _setup_test_db()
    yield
    global _test_engine
    if _test_engine:
        await _test_engine.dispose()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a test database session.

    Uses in-memory SQLite for isolation and speed.
    Each test gets a fresh database state.
    """
    global _test_engine, _test_session_factory

    if _test_session_factory is None:
        await _setup_test_db()

    # Clean up all tables before each test for isolation
    async with _test_engine.begin() as conn:
        from src.models.file import Base
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())

    async with _test_session_factory() as session:
        yield session


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Create an async test client for the FastAPI app.

    Bypasses actual HTTP layer for faster tests.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def sync_client() -> TestClient:
    """
    Create a sync test client for the FastAPI app.

    Uses the dependency override for database.
    Cleans up database tables before each test for isolation.
    """
    global _test_engine, _test_session_factory

    if _test_session_factory is None:
        await _setup_test_db()

    # Clean up all tables before each test for isolation
    async with _test_engine.begin() as conn:
        from src.models.file import Base
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())

    return TestClient(app)


@pytest.fixture
def mock_env(monkeypatch):
    """
    Mock environment variables for tests.

    Usage:
    ```python
    def test_something(mock_env):
        mock_env("DATABASE_URL", "sqlite:///:memory:")
    ```
    """
    def set_env(key: str, value: str):
        monkeypatch.setenv(key, value)
    return set_env
