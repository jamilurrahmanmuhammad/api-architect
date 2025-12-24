"""
Database connection and session management for API Architect Editor API.

Provides async SQLAlchemy engine, session factory, and utilities for:
- Async PostgreSQL connections (asyncpg driver)
- Connection pooling with configurable limits
- Session management with async context managers
- Database initialization and cleanup
"""

import os
from typing import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool


class DatabaseConfig:
    """Database configuration from environment variables."""

    def __init__(self):
        self.url = os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://user:password@localhost:5432/api_architect_editor",
        )
        self.echo = os.getenv("DATABASE_ECHO", "False").lower() in ("true", "1", "yes")
        self.pool_size = int(os.getenv("DATABASE_POOL_SIZE", "5"))
        self.max_overflow = int(os.getenv("DATABASE_MAX_OVERFLOW", "10"))
        self.pool_timeout = int(os.getenv("DATABASE_POOL_TIMEOUT", "30"))
        self.pool_recycle = int(os.getenv("DATABASE_POOL_RECYCLE", "3600"))


# Global database configuration
_db_config = DatabaseConfig()

# Create async engine with asyncpg driver
# asyncpg provides true async PostgreSQL driver for Python
engine = create_async_engine(
    _db_config.url,
    echo=_db_config.echo,
    pool_size=_db_config.pool_size,
    max_overflow=_db_config.max_overflow,
    pool_timeout=_db_config.pool_timeout,
    pool_recycle=_db_config.pool_recycle,
    # Use QueuePool (default) for async operations
    # NullPool can be used to disable pooling if needed
    future=True,
    connect_args={
        "timeout": 10,  # Connection timeout in seconds
        "command_timeout": 10,  # Command timeout
        "server_settings": {
            "application_name": "api-architect-editor-api",
            "timezone": "UTC",
        },
    },
)

# Create async session factory
# expire_on_commit=False: Keep objects in session after commit
# This allows accessing lazy-loaded relationships after commit
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection for FastAPI routes.

    Yields an AsyncSession for database operations.
    Session is automatically closed on exit.

    Usage in FastAPI route:
    ```python
    @app.get("/items")
    async def get_items(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(Item))
        return result.scalars().all()
    ```

    Yields:
        AsyncSession: Database session for async operations
    """
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database.

    Creates all tables defined in SQLAlchemy models.
    Should be called on application startup.

    Usage:
    ```python
    @app.on_event("startup")
    async def startup():
        await init_db()
    ```
    """
    from src.models.file import Base  # Import after models are defined

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def cleanup_db() -> None:
    """
    Clean up database connections.

    Disposes of connection pool and closes all connections.
    Should be called on application shutdown.

    Usage:
    ```python
    @app.on_event("shutdown")
    async def shutdown():
        await cleanup_db()
    ```
    """
    await engine.dispose()


# Event listeners for connection monitoring (optional)
@event.listens_for(engine.sync_engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log database connection events."""
    # Can be used for custom connection setup
    pass


@event.listens_for(engine.sync_engine, "close")
def receive_close(dbapi_conn, connection_record):
    """Log database disconnection events."""
    # Can be used for cleanup on disconnection
    pass


@event.listens_for(engine.sync_engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Log connection returned to pool."""
    pass


@event.listens_for(engine.sync_engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log connection borrowed from pool."""
    pass
