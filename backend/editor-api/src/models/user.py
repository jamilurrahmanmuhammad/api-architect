"""User and authentication models."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserPreferences(BaseModel):
    """User preferences stored in session."""

    theme: str = Field(default="system", description="Theme preference: light, dark, system")


class UserSession(BaseModel):
    """User session entity."""

    id: str = Field(..., description="Session ID")
    userId: str = Field(..., description="User ID")
    name: str = Field(..., description="User display name")
    email: EmailStr = Field(..., description="User email")
    isAuthenticated: bool = Field(default=True, description="Authentication status")
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    createdAt: datetime = Field(default_factory=datetime.now, description="Session creation time")


class LoginRequest(BaseModel):
    """Login request body."""

    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=1, description="User password")


class LoginResponse(BaseModel):
    """Login response with token and user session."""

    token: str = Field(..., description="Authentication token")
    user: UserSession = Field(..., description="User session data")


class LogoutResponse(BaseModel):
    """Logout response."""

    message: str = Field(default="Successfully logged out")
