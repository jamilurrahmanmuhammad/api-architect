"""
T002: OAS Repository for persistence operations.

Provides database operations for OAS specification storage and retrieval
with version tracking and transaction support.

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import Optional, List
from datetime import datetime
from uuid import UUID
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, delete

from src.db.migrations.migration_001_create_oas_specs_table import OASSpec, OASEditTransaction


class OASRepository:
    """Repository for OAS specification persistence."""

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        self.session = session

    async def save_spec(
        self,
        spec_id: str,
        oas_content: str,
        content_format: str = "yaml",
        api_title: Optional[str] = None,
        api_version: Optional[str] = None,
        description: Optional[str] = None,
    ) -> OASSpec:
        """
        Save or update an OAS specification.

        Args:
            spec_id: Unique identifier for the spec
            oas_content: OAS document content (YAML or JSON)
            content_format: "yaml" or "json"
            api_title: Extracted API title (for indexing)
            api_version: Extracted API version (for indexing)
            description: Optional description

        Returns:
            Created or updated OASSpec object
        """
        # Check if spec exists
        stmt = select(OASSpec).where(OASSpec.spec_id == spec_id)
        result = await self.session.execute(stmt)
        existing = result.scalars().first()

        if existing:
            # Update existing spec
            existing.oas_content = oas_content
            existing.content_format = content_format
            existing.api_title = api_title or existing.api_title
            existing.api_version = api_version or existing.api_version
            existing.version += 1
            existing.updated_at = datetime.utcnow()
            if description:
                existing.description = description
            spec = existing
        else:
            # Create new spec
            spec = OASSpec(
                spec_id=spec_id,
                oas_content=oas_content,
                content_format=content_format,
                api_title=api_title,
                api_version=api_version,
                description=description,
            )
            self.session.add(spec)

        await self.session.flush()
        return spec

    async def get_spec(self, spec_id: str) -> Optional[OASSpec]:
        """
        Retrieve a specification by ID.

        Args:
            spec_id: Unique identifier

        Returns:
            OASSpec object or None if not found
        """
        stmt = select(OASSpec).where(
            and_(OASSpec.spec_id == spec_id, OASSpec.is_deleted == False)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_spec_by_uuid(self, uuid_val: UUID) -> Optional[OASSpec]:
        """
        Retrieve a specification by UUID.

        Args:
            uuid_val: UUID primary key

        Returns:
            OASSpec object or None if not found
        """
        stmt = select(OASSpec).where(
            and_(OASSpec.id == uuid_val, OASSpec.is_deleted == False)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_specs(
        self,
        limit: int = 100,
        offset: int = 0,
        api_title_filter: Optional[str] = None,
    ) -> tuple[List[OASSpec], int]:
        """
        List all specifications.

        Args:
            limit: Maximum results to return
            offset: Pagination offset
            api_title_filter: Optional title filter (case-insensitive)

        Returns:
            Tuple of (specs list, total count)
        """
        query = select(OASSpec).where(OASSpec.is_deleted == False)

        if api_title_filter:
            query = query.where(
                OASSpec.api_title.ilike(f"%{api_title_filter}%")
            )

        # Get total count (using the same filter as the main query)
        count_query = select(OASSpec).where(OASSpec.is_deleted == False)
        if api_title_filter:
            count_query = count_query.where(
                OASSpec.api_title.ilike(f"%{api_title_filter}%")
            )
        count_result = await self.session.execute(count_query)
        total = len(count_result.scalars().all())

        # Get paginated results
        query = query.order_by(desc(OASSpec.created_at))
        query = query.limit(limit).offset(offset)
        result = await self.session.execute(query)
        specs = result.scalars().all()

        return specs, total

    async def delete_spec(self, spec_id: str) -> bool:
        """
        Soft delete a specification.

        Args:
            spec_id: Unique identifier

        Returns:
            True if deleted, False if not found
        """
        spec = await self.get_spec(spec_id)
        if not spec:
            return False

        spec.is_deleted = True
        spec.updated_at = datetime.utcnow()
        await self.session.flush()
        return True

    async def hard_delete_spec(self, spec_id: str) -> bool:
        """
        Permanently delete a specification and its transactions.

        Args:
            spec_id: Unique identifier

        Returns:
            True if deleted, False if not found
        """
        spec = await self.get_spec(spec_id)
        if not spec:
            return False

        # Delete transactions first
        stmt = delete(OASEditTransaction).where(
            OASEditTransaction.spec_id == spec.id
        )
        await self.session.execute(stmt)

        # Delete spec
        await self.session.delete(spec)
        await self.session.flush()
        return True

    async def record_transaction(
        self,
        spec_id: UUID,
        edit_path: str,
        old_value: Optional[str],
        new_value: Optional[str],
        change_type: str = "update",
        edited_by: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> OASEditTransaction:
        """
        Record an edit transaction for audit trail.

        Args:
            spec_id: UUID of the spec
            edit_path: JSONPointer format path to edited field
            old_value: Previous value
            new_value: New value
            change_type: "create", "update", or "delete"
            edited_by: User who made the edit
            session_id: Session identifier

        Returns:
            Created OASEditTransaction object
        """
        transaction = OASEditTransaction(
            spec_id=spec_id,
            edit_path=edit_path,
            old_value=old_value,
            new_value=new_value,
            change_type=change_type,
            edited_by=edited_by,
            session_id=session_id,
        )
        self.session.add(transaction)
        await self.session.flush()
        return transaction

    async def get_transactions(
        self,
        spec_id: UUID,
        limit: int = 100,
    ) -> List[OASEditTransaction]:
        """
        Get edit transactions for a spec (in reverse chronological order).

        Args:
            spec_id: UUID of the spec
            limit: Maximum results

        Returns:
            List of OASEditTransaction objects
        """
        stmt = (
            select(OASEditTransaction)
            .where(OASEditTransaction.spec_id == spec_id)
            .order_by(desc(OASEditTransaction.timestamp))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_transactions_for_path(
        self,
        spec_id: UUID,
        edit_path: str,
    ) -> List[OASEditTransaction]:
        """
        Get transactions for a specific path in the OAS.

        Args:
            spec_id: UUID of the spec
            edit_path: JSONPointer format path

        Returns:
            List of OASEditTransaction objects
        """
        stmt = (
            select(OASEditTransaction)
            .where(
                and_(
                    OASEditTransaction.spec_id == spec_id,
                    OASEditTransaction.edit_path == edit_path,
                )
            )
            .order_by(desc(OASEditTransaction.timestamp))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def commit(self) -> None:
        """Commit all changes to database."""
        await self.session.commit()

    async def rollback(self) -> None:
        """Rollback all changes."""
        await self.session.rollback()


# Convenient imports
__all__ = ["OASRepository", "OASSpec", "OASEditTransaction"]
