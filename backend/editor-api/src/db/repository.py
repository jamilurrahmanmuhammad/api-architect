"""
File Repository for RequirementFile CRUD operations.

Provides async CRUD operations for RequirementFile entities using SQLAlchemy.
Implements the Repository pattern for data access abstraction.
"""

from datetime import UTC, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.file import RequirementFile


class FileRepository:
    """
    Repository for RequirementFile CRUD operations.

    Provides methods for creating, reading, updating, and deleting
    requirement files. All operations are async and use SQLAlchemy.

    Attributes:
        session: AsyncSession for database operations
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize repository with database session.

        Args:
            session: AsyncSession for database operations
        """
        self.session = session

    # =========================================================================
    # CREATE
    # =========================================================================

    async def create(
        self,
        name: str,
        content: str = "",
        status: str = "draft",
        created_by: Optional[str] = None,
    ) -> RequirementFile:
        """
        Create a new requirement file.

        Args:
            name: File name (e.g., 'petstore-api')
            content: DSL source code content
            status: File status (draft, reviewing, approved, published)
            created_by: User ID who created the file (optional)

        Returns:
            Created RequirementFile instance
        """
        file = RequirementFile(
            name=name,
            content=content,
            status=status,
        )

        if created_by:
            file.created_by = UUID(created_by)

        self.session.add(file)
        await self.session.commit()
        await self.session.refresh(file)

        return file

    # =========================================================================
    # READ
    # =========================================================================

    async def get_by_id(self, file_id: str) -> Optional[RequirementFile]:
        """
        Get a file by its ID.

        Args:
            file_id: UUID string of the file

        Returns:
            RequirementFile if found, None otherwise
        """
        try:
            uuid_id = UUID(file_id)
        except (ValueError, AttributeError):
            return None

        result = await self.session.execute(
            select(RequirementFile).where(RequirementFile.id == uuid_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[RequirementFile]:
        """
        Get a file by its name.

        Args:
            name: File name to search for

        Returns:
            RequirementFile if found, None otherwise
        """
        result = await self.session.execute(
            select(RequirementFile).where(RequirementFile.name == name)
        )
        return result.scalar_one_or_none()

    async def list_files(
        self,
        limit: int = 100,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> list[RequirementFile]:
        """
        List requirement files with optional filtering and pagination.

        Args:
            limit: Maximum number of files to return
            offset: Number of files to skip
            status: Filter by status (optional)

        Returns:
            List of RequirementFile instances ordered by updated_at desc
        """
        query = select(RequirementFile)

        if status:
            query = query.where(RequirementFile.status == status)

        query = query.order_by(RequirementFile.updated_at.desc())
        query = query.limit(limit).offset(offset)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    # =========================================================================
    # UPDATE
    # =========================================================================

    async def update(
        self,
        file_id: str,
        name: Optional[str] = None,
        content: Optional[str] = None,
        status: Optional[str] = None,
        parsed_at: Optional[datetime] = None,
    ) -> Optional[RequirementFile]:
        """
        Update a requirement file.

        Increments version on each update and updates the updated_at timestamp.

        Args:
            file_id: UUID string of the file to update
            name: New file name (optional)
            content: New DSL content (optional)
            status: New status (optional)
            parsed_at: Last parse timestamp (optional)

        Returns:
            Updated RequirementFile if found, None otherwise
        """
        file = await self.get_by_id(file_id)
        if not file:
            return None

        # Update fields if provided
        if name is not None:
            file.name = name
        if content is not None:
            file.content = content
        if status is not None:
            file.status = status
        if parsed_at is not None:
            file.parsed_at = parsed_at

        # Increment version
        file.version += 1

        # Update timestamp
        file.updated_at = datetime.now(UTC)

        await self.session.commit()
        await self.session.refresh(file)

        return file

    # =========================================================================
    # DELETE
    # =========================================================================

    async def delete(self, file_id: str) -> bool:
        """
        Delete a requirement file.

        Cascades delete to all related entities (services, models, etc.)

        Args:
            file_id: UUID string of the file to delete

        Returns:
            True if file was deleted, False if not found
        """
        file = await self.get_by_id(file_id)
        if not file:
            return False

        await self.session.delete(file)
        await self.session.commit()

        return True

    # =========================================================================
    # COUNT / EXISTS
    # =========================================================================

    async def count(self, status: Optional[str] = None) -> int:
        """
        Count requirement files.

        Args:
            status: Filter by status (optional)

        Returns:
            Number of files matching criteria
        """
        query = select(func.count()).select_from(RequirementFile)

        if status:
            query = query.where(RequirementFile.status == status)

        result = await self.session.execute(query)
        return result.scalar_one()

    async def exists(self, file_id: str) -> bool:
        """
        Check if a file exists by ID.

        Args:
            file_id: UUID string to check

        Returns:
            True if file exists, False otherwise
        """
        try:
            uuid_id = UUID(file_id)
        except (ValueError, AttributeError):
            return False

        query = select(func.count()).select_from(RequirementFile).where(
            RequirementFile.id == uuid_id
        )
        result = await self.session.execute(query)
        return result.scalar_one() > 0

    async def name_exists(self, name: str) -> bool:
        """
        Check if a file with given name exists.

        Args:
            name: File name to check

        Returns:
            True if name is taken, False otherwise
        """
        query = select(func.count()).select_from(RequirementFile).where(
            RequirementFile.name == name
        )
        result = await self.session.execute(query)
        return result.scalar_one() > 0
