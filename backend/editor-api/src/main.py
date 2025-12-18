"""
FastAPI application entry point for Requirements Grammar Authoring Studio.

Provides core endpoints for file management, parsing, validation, and export.
Includes CORS, structured logging, error handling, and database lifecycle.
"""

import os
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routes import auth, files, modules, parse, validate, export
from src.db.database import init_db, cleanup_db
from src.middleware.error_handler import setup_error_handlers
from src.utils.logging import setup_logging, get_logger

# Initialize logging before app creation
_environment = os.getenv("ENVIRONMENT", "development")
_log_level = os.getenv("LOG_LEVEL", "INFO")
_use_json = os.getenv("LOG_FORMAT", "json").lower() == "json"

setup_logging(
    level=_log_level,
    environment=_environment,
    use_json=_use_json and _environment != "development",
)

logger = get_logger(__name__)


# Application lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application startup and shutdown events.

    Startup:
    - Initialize database connections
    - Load configuration
    - Set up observability (logging, metrics)

    Shutdown:
    - Close database connections
    - Flush metrics and logs
    """
    # Startup
    logger.info(
        "Starting API Architect Editor API",
        environment=_environment,
        version="0.1.0",
    )

    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        # Continue startup even if DB init fails (for health checks)

    yield

    # Shutdown
    logger.info("Shutting down API Architect Editor API")

    try:
        await cleanup_db()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during database cleanup: {e}")


# Create FastAPI application with async support
app = FastAPI(
    title="API Architect Editor API",
    description="Requirements Grammar Authoring Studio - Backend API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Setup error handlers and request ID middleware
setup_error_handlers(app)

# CORS middleware configuration
# Allow requests from frontend during development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://localhost:5173",  # Vite default port
        "http://localhost:5174",  # Vite fallback port 1
        "http://localhost:5175",  # Vite fallback port 2
        "https://api-architect.local",  # Production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(modules.router, prefix="/api/v1")
app.include_router(validate.router, prefix="/api/v1")
app.include_router(parse.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")


# Health check endpoint
@app.get("/health")
async def health_check() -> dict[str, Any]:
    """
    Health check endpoint for Kubernetes liveness/readiness probes.

    Returns:
        dict: Status indicator, service info, and timestamp
    """
    return {
        "status": "healthy",
        "service": "api-architect-editor-api",
        "version": "0.1.0",
        "environment": _environment,
        "timestamp": datetime.now(UTC).isoformat(),
    }


# Readiness check endpoint (includes database connectivity)
@app.get("/ready")
async def readiness_check() -> dict[str, Any]:
    """
    Readiness check endpoint for Kubernetes readiness probes.

    Checks database connectivity before declaring ready.

    Returns:
        dict: Status indicator with dependency checks
    """
    checks = {
        "database": "unknown",
    }

    # Check database connectivity
    try:
        from sqlalchemy import text
        from src.db.database import async_session_factory
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
            checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"

    # Determine overall status
    all_healthy = all(v == "healthy" for v in checks.values())
    status_code = 200 if all_healthy else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_healthy else "not_ready",
            "service": "api-architect-editor-api",
            "version": "0.1.0",
            "checks": checks,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    )


# Root endpoint
@app.get("/")
async def root() -> dict[str, str]:
    """
    Root endpoint providing API information.

    Returns:
        dict: API name, version, and documentation link
    """
    return {
        "name": "API Architect Editor API",
        "version": "0.1.0",
        "docs": "/api/docs",
        "environment": _environment,
    }


if __name__ == "__main__":
    import uvicorn

    # Run with: uvicorn src.main:app --reload --port 8765
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8765,
        reload=True,
        log_level="info",
    )
