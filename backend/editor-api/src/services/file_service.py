"""
FileService - Business Logic Layer for Requirement Files.

Provides high-level operations for managing requirement files with:
- Input validation
- Business rule enforcement
- Error handling with meaningful exceptions
- Integration with FileRepository for persistence
"""

from datetime import datetime, UTC
from typing import Any, Optional

from src.db.repository import FileRepository
from src.models.file import RequirementFile


# =============================================================================
# Custom Exceptions
# =============================================================================


class FileServiceError(Exception):
    """Base exception for FileService errors."""

    pass


class FileNotFoundError(FileServiceError):
    """Raised when a requested file does not exist."""

    def __init__(self, identifier: str, by: str = "id"):
        self.identifier = identifier
        self.by = by
        super().__init__(f"File not found with {by}: {identifier}")


class FileNameExistsError(FileServiceError):
    """Raised when attempting to create/update a file with an existing name."""

    def __init__(self, name: str):
        self.name = name
        super().__init__(f"File with name '{name}' already exists")


class FileValidationError(FileServiceError):
    """Raised when file data fails validation."""

    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"Validation error for {field}: {message}")


# =============================================================================
# FileService
# =============================================================================


# Valid file statuses
VALID_STATUSES = {"draft", "reviewing", "approved", "published"}


class FileService:
    """
    Business logic layer for requirement file operations.

    Handles validation, business rules, and coordinates with FileRepository
    for persistence operations.

    Attributes:
        repository: FileRepository instance for data access
    """

    def __init__(self, repository: FileRepository):
        """
        Initialize FileService with a repository.

        Args:
            repository: FileRepository instance for data access
        """
        self.repository = repository

    # =========================================================================
    # CREATE
    # =========================================================================

    async def create_file(
        self,
        name: str,
        content: str = "",
        status: str = "draft",
        created_by: Optional[str] = None,
    ) -> RequirementFile:
        """
        Create a new requirement file.

        Validates input, checks for duplicate names, and creates the file.

        Args:
            name: File name (must be unique, non-empty)
            content: DSL source code content
            status: File status (must be one of: draft, reviewing, approved, published)
            created_by: User ID who created the file (optional)

        Returns:
            Created RequirementFile instance

        Raises:
            FileValidationError: If name is empty or status is invalid
            FileNameExistsError: If name is already taken
        """
        # Validate and clean name
        name = name.strip() if name else ""
        if not name:
            raise FileValidationError("name", "Name cannot be empty")

        # Validate status
        if status not in VALID_STATUSES:
            raise FileValidationError(
                "status",
                f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}"
            )

        # Check for duplicate name
        if await self.repository.name_exists(name):
            raise FileNameExistsError(name)

        # Create file
        return await self.repository.create(
            name=name,
            content=content,
            status=status,
            created_by=created_by,
        )

    # =========================================================================
    # READ
    # =========================================================================

    async def get_file(self, file_id: str) -> RequirementFile:
        """
        Get a file by its ID.

        Args:
            file_id: UUID string of the file

        Returns:
            RequirementFile instance

        Raises:
            FileNotFoundError: If file does not exist
        """
        file = await self.repository.get_by_id(file_id)
        if not file:
            raise FileNotFoundError(file_id, by="id")
        return file

    async def get_file_by_name(self, name: str) -> RequirementFile:
        """
        Get a file by its name.

        Args:
            name: File name to search for

        Returns:
            RequirementFile instance

        Raises:
            FileNotFoundError: If file does not exist
        """
        file = await self.repository.get_by_name(name)
        if not file:
            raise FileNotFoundError(name, by="name")
        return file

    async def list_files(
        self,
        limit: int = 100,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        List files with pagination and optional filtering.

        Args:
            limit: Maximum number of files to return (default 100)
            offset: Number of files to skip (default 0)
            status: Filter by status (optional)

        Returns:
            Dictionary with:
                - files: List of RequirementFile instances
                - total: Total count matching criteria
                - limit: Applied limit
                - offset: Applied offset
        """
        files = await self.repository.list_files(
            limit=limit,
            offset=offset,
            status=status,
        )
        total = await self.repository.count(status=status)

        return {
            "files": files,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    # =========================================================================
    # UPDATE
    # =========================================================================

    async def update_file(
        self,
        file_id: str,
        name: Optional[str] = None,
        content: Optional[str] = None,
        status: Optional[str] = None,
        parsed_at: Optional[datetime] = None,
    ) -> RequirementFile:
        """
        Update a file's attributes.

        Only provided attributes are updated. Version is auto-incremented.

        Args:
            file_id: UUID string of the file to update
            name: New file name (optional)
            content: New DSL content (optional)
            status: New status (optional)
            parsed_at: Last parse timestamp (optional)

        Returns:
            Updated RequirementFile instance

        Raises:
            FileNotFoundError: If file does not exist
            FileValidationError: If status is invalid
            FileNameExistsError: If new name is already taken
        """
        # Verify file exists
        existing = await self.repository.get_by_id(file_id)
        if not existing:
            raise FileNotFoundError(file_id, by="id")

        # Validate status if provided
        if status is not None and status not in VALID_STATUSES:
            raise FileValidationError(
                "status",
                f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}"
            )

        # Check for duplicate name if name is being changed
        if name is not None:
            name = name.strip()
            if name != existing.name and await self.repository.name_exists(name):
                raise FileNameExistsError(name)

        # Update file
        result = await self.repository.update(
            file_id=file_id,
            name=name,
            content=content,
            status=status,
            parsed_at=parsed_at,
        )

        # Should not happen if get_by_id succeeded, but handle gracefully
        if not result:
            raise FileNotFoundError(file_id, by="id")

        return result

    # =========================================================================
    # DELETE
    # =========================================================================

    async def delete_file(self, file_id: str) -> bool:
        """
        Delete a file.

        Cascades delete to all related entities (services, models, etc.)

        Args:
            file_id: UUID string of the file to delete

        Returns:
            True if file was deleted

        Raises:
            FileNotFoundError: If file does not exist
        """
        deleted = await self.repository.delete(file_id)
        if not deleted:
            raise FileNotFoundError(file_id, by="id")
        return True

    # =========================================================================
    # EXISTS
    # =========================================================================

    async def file_exists(self, file_id: str) -> bool:
        """
        Check if a file exists by ID.

        Args:
            file_id: UUID string to check

        Returns:
            True if file exists, False otherwise
        """
        return await self.repository.exists(file_id)

    async def name_available(self, name: str) -> bool:
        """
        Check if a file name is available.

        Args:
            name: File name to check

        Returns:
            True if name is available, False if taken
        """
        return not await self.repository.name_exists(name)


# =============================================================================
# Factory Function
# =============================================================================


def get_file_service(repository: FileRepository) -> FileService:
    """
    Factory function to create FileService instance.

    Args:
        repository: FileRepository instance for data access

    Returns:
        FileService instance
    """
    return FileService(repository)
