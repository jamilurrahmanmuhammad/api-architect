"""
FastAPI application entry point for Requirements Grammar Authoring Studio.

Provides core endpoints for file management, parsing, validation, and export.
"""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routes import auth, modules

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
    print("🚀 Starting API Architect Editor API...")

    yield

    # Shutdown
    print("🛑 Shutting down API Architect Editor API...")


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
app.include_router(modules.router, prefix="/api/v1")


# Health check endpoint
@app.get("/health")
async def health_check() -> dict[str, Any]:
    """
    Health check endpoint for Kubernetes liveness/readiness probes.

    Returns:
        dict: Status indicator and timestamp
    """
    return {
        "status": "healthy",
        "service": "api-architect-editor-api",
        "version": "0.1.0",
    }


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
    }


# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors.

    Logs error and returns standardized error response.
    """
    print(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
        },
    )


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
