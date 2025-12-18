"""FastAPI application entry point.

T014: GREEN - Create FastAPI app entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.middleware.error_handler import setup_exception_handlers
from src.api.middleware.logging import LoggingMiddleware
from src.api.routes import auth, health, modules
from src.config.settings import get_settings

settings = get_settings()

app = FastAPI(
    title="API Architect - Core Framework API",
    description="REST API for the API Architect Core Framework & Homepage feature.",
    version=settings.app_version,
    debug=settings.debug,
)

# Middleware (order matters - first added is outermost)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
setup_exception_handlers(app)

# Include routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(modules.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
