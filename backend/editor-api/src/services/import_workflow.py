"""
T010: OAS Import Workflow Service.

Complete orchestration of CSV and OAS imports with:
- Multi-source support (CSV, OAS files)
- Profile-based CSV handling (Basic, Advanced, Technical, Expert)
- Validation and error handling
- Transaction tracking for audit trail
- Database persistence
- Detailed import reporting

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from enum import Enum
import json
import yaml

from src.db.oas_repository import OASRepository
from src.services.oas_merge_service import OASMergeService
from src.services.oas_validator import OASValidator
from src.services.csv_to_oas_converter import CSVToOASConverter
from src.services.oas_transaction_tracker import OASTransactionTracker


class ImportSource(str, Enum):
    """Supported import sources."""

    CSV = "csv"
    OAS = "oas"
    YAML = "yaml"
    JSON = "json"


class ImportError:
    """Represents an import error."""

    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        """Initialize import error."""
        self.code = code
        self.message = message
        self.details = details or {}

    def __str__(self) -> str:
        """String representation."""
        return f"{self.code}: {self.message}"

    def __repr__(self) -> str:
        """Debug representation."""
        return f"ImportError(code={self.code}, message={self.message})"


class ImportResult:
    """Result of an import operation."""

    def __init__(
        self,
        spec_id: str,
        success: bool,
        source: ImportSource,
        message: str,
        errors: Optional[List[ImportError]] = None,
        rows_imported: int = 0,
        paths_added: int = 0,
        paths_updated: int = 0,
        schemas_added: int = 0,
        schemas_updated: int = 0,
    ):
        """Initialize import result."""
        self.spec_id = spec_id
        self.success = success
        self.source = source
        self.message = message
        self.errors = errors or []
        self.rows_imported = rows_imported
        self.paths_added = paths_added
        self.paths_updated = paths_updated
        self.schemas_added = schemas_added
        self.schemas_updated = schemas_updated
        self.timestamp = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "spec_id": self.spec_id,
            "success": self.success,
            "source": self.source.value,
            "message": self.message,
            "errors": [{"code": e.code, "message": e.message, "details": e.details} for e in self.errors],
            "stats": {
                "rows_imported": self.rows_imported,
                "paths_added": self.paths_added,
                "paths_updated": self.paths_updated,
                "schemas_added": self.schemas_added,
                "schemas_updated": self.schemas_updated,
            },
            "timestamp": self.timestamp.isoformat(),
        }


class ImportWorkflow:
    """Complete import workflow orchestration."""

    def __init__(
        self,
        repository: OASRepository,
        merger: OASMergeService,
        validator: OASValidator,
        csv_converter: CSVToOASConverter,
        tracker: OASTransactionTracker,
    ):
        """
        Initialize import workflow.

        Args:
            repository: OAS repository for persistence
            merger: OAS merge service
            validator: OAS validator
            csv_converter: CSV to OAS converter
            tracker: Transaction tracker
        """
        self.repository = repository
        self.merger = merger
        self.validator = validator
        self.csv_converter = csv_converter
        self.tracker = tracker

    async def import_csv(
        self,
        csv_content: str,
        spec_id: str,
        api_title: Optional[str] = None,
        profile: str = "basic",
        merge: bool = False,
        edited_by: Optional[str] = None,
    ) -> ImportResult:
        """
        Import CSV content and create/update OAS specification.

        Args:
            csv_content: CSV file content as string
            spec_id: Specification identifier
            api_title: API title for new specs
            profile: CSV profile (basic, advanced, technical, expert)
            merge: Whether to merge with existing spec
            edited_by: User identifier for audit trail

        Returns:
            ImportResult with success status and details
        """
        try:
            # Step 1: Convert CSV to OAS
            try:
                oas_dict = await self._convert_csv_to_oas(csv_content, profile)
            except Exception as e:
                return ImportResult(
                    spec_id=spec_id,
                    success=False,
                    source=ImportSource.CSV,
                    message=f"CSV conversion failed: {str(e)}",
                    errors=[
                        ImportError(
                            code="CSV_CONVERSION_ERROR",
                            message=str(e),
                        )
                    ],
                )

            # Step 2: Add or validate title
            if api_title:
                oas_dict["info"]["title"] = api_title

            oas_content = json.dumps(oas_dict)

            # Step 3: Handle merge if needed
            if merge:
                existing_spec = await self.repository.get_spec(spec_id)
                if existing_spec:
                    try:
                        existing_dict = json.loads(existing_spec.oas_content)
                        oas_dict = await self.merger.merge(existing_dict, oas_dict)
                        oas_content = json.dumps(oas_dict)
                    except Exception as e:
                        return ImportResult(
                            spec_id=spec_id,
                            success=False,
                            source=ImportSource.CSV,
                            message=f"Merge conflict detected: {str(e)}",
                            errors=[
                                ImportError(
                                    code="MERGE_CONFLICT",
                                    message=str(e),
                                )
                            ],
                        )

            # Step 4: Validate merged OAS
            try:
                validation_result = await self.validator.validate(oas_dict)
            except Exception as e:
                return ImportResult(
                    spec_id=spec_id,
                    success=False,
                    source=ImportSource.CSV,
                    message=f"OAS validation failed: {str(e)}",
                    errors=[
                        ImportError(
                            code="VALIDATION_ERROR",
                            message=str(e),
                        )
                    ],
                )

            if not validation_result.get("valid", False):
                errors = [
                    ImportError(
                        code="VALIDATION_FAILED",
                        message=error.get("message", "Unknown validation error"),
                        details=error,
                    )
                    for error in validation_result.get("errors", [])
                ]
                return ImportResult(
                    spec_id=spec_id,
                    success=False,
                    source=ImportSource.CSV,
                    message="OAS validation failed",
                    errors=errors,
                )

            # Step 5: Save to database
            try:
                saved_spec = await self.repository.save_spec(
                    spec_id=spec_id,
                    oas_content=oas_content,
                    content_format="json",
                    api_title=oas_dict.get("info", {}).get("title"),
                    api_version=oas_dict.get("info", {}).get("version"),
                )
            except Exception as e:
                return ImportResult(
                    spec_id=spec_id,
                    success=False,
                    source=ImportSource.CSV,
                    message=f"Database save failed: {str(e)}",
                    errors=[
                        ImportError(
                            code="DATABASE_ERROR",
                            message=str(e),
                        )
                    ],
                )

            # Step 6: Track transaction
            try:
                if hasattr(saved_spec, 'id'):
                    # Record import as a single transaction
                    await self.tracker.record_edit(
                        spec_id=saved_spec.id,
                        edit_path="/",
                        old_value=None,
                        new_value=oas_content[:100],  # Store first 100 chars
                        change_type="create",
                        edited_by=edited_by,
                        session_id=f"import-csv-{spec_id}",
                    )
            except Exception:
                # Transaction tracking failure should not block successful import
                pass

            # Calculate statistics
            paths = oas_dict.get("paths", {})
            schemas = oas_dict.get("components", {}).get("schemas", {})

            return ImportResult(
                spec_id=spec_id,
                success=True,
                source=ImportSource.CSV,
                message=f"Successfully imported CSV with {len(paths)} paths and {len(schemas)} schemas",
                rows_imported=len([line for line in csv_content.split('\n') if line.strip() and not line.startswith(('path', 'operation'))]),
                paths_added=len(paths),
                schemas_added=len(schemas),
            )

        except Exception as e:
            return ImportResult(
                spec_id=spec_id,
                success=False,
                source=ImportSource.CSV,
                message=f"Unexpected error during import: {str(e)}",
                errors=[
                    ImportError(
                        code="UNEXPECTED_ERROR",
                        message=str(e),
                    )
                ],
            )

    async def import_oas(
        self,
        oas_content: str,
        spec_id: str,
        content_format: str = "json",
        merge: bool = False,
        edited_by: Optional[str] = None,
    ) -> ImportResult:
        """
        Import OAS specification (JSON or YAML).

        Args:
            oas_content: OAS content as string
            spec_id: Specification identifier
            content_format: "json" or "yaml"
            merge: Whether to merge with existing spec
            edited_by: User identifier for audit trail

        Returns:
            ImportResult with success status and details
        """
        try:
            # Parse OAS content
            try:
                if content_format == "yaml":
                    oas_dict = yaml.safe_load(oas_content)
                else:
                    oas_dict = json.loads(oas_content)
            except Exception as e:
                return ImportResult(
                    spec_id=spec_id,
                    success=False,
                    source=ImportSource.OAS,
                    message=f"OAS parsing failed: {str(e)}",
                    errors=[
                        ImportError(
                            code="PARSE_ERROR",
                            message=str(e),
                        )
                    ],
                )

            # Handle merge if needed
            if merge:
                existing_spec = await self.repository.get_spec(spec_id)
                if existing_spec:
                    try:
                        existing_dict = json.loads(existing_spec.oas_content)
                        oas_dict = await self.merger.merge(existing_dict, oas_dict)
                    except Exception as e:
                        return ImportResult(
                            spec_id=spec_id,
                            success=False,
                            source=ImportSource.OAS,
                            message=f"Merge failed: {str(e)}",
                            errors=[
                                ImportError(
                                    code="MERGE_ERROR",
                                    message=str(e),
                                )
                            ],
                        )

            # Validate OAS
            try:
                validation_result = await self.validator.validate(oas_dict)
            except Exception as e:
                return ImportResult(
                    spec_id=spec_id,
                    success=False,
                    source=ImportSource.OAS,
                    message=f"Validation failed: {str(e)}",
                    errors=[
                        ImportError(
                            code="VALIDATION_ERROR",
                            message=str(e),
                        )
                    ],
                )

            if not validation_result.get("valid", False):
                errors = [
                    ImportError(
                        code="VALIDATION_FAILED",
                        message=error.get("message", "Unknown validation error"),
                        details=error,
                    )
                    for error in validation_result.get("errors", [])
                ]
                return ImportResult(
                    spec_id=spec_id,
                    success=False,
                    source=ImportSource.OAS,
                    message="OAS validation failed",
                    errors=errors,
                )

            # Save to database
            try:
                saved_spec = await self.repository.save_spec(
                    spec_id=spec_id,
                    oas_content=json.dumps(oas_dict),
                    content_format="json",
                    api_title=oas_dict.get("info", {}).get("title"),
                    api_version=oas_dict.get("info", {}).get("version"),
                )
            except Exception as e:
                return ImportResult(
                    spec_id=spec_id,
                    success=False,
                    source=ImportSource.OAS,
                    message=f"Database save failed: {str(e)}",
                    errors=[
                        ImportError(
                            code="DATABASE_ERROR",
                            message=str(e),
                        )
                    ],
                )

            # Track transaction
            try:
                if hasattr(saved_spec, 'id'):
                    await self.tracker.record_edit(
                        spec_id=saved_spec.id,
                        edit_path="/",
                        old_value=None,
                        new_value=json.dumps(oas_dict)[:100],
                        change_type="create",
                        edited_by=edited_by,
                        session_id=f"import-oas-{spec_id}",
                    )
            except Exception:
                pass

            paths = oas_dict.get("paths", {})
            schemas = oas_dict.get("components", {}).get("schemas", {})

            return ImportResult(
                spec_id=spec_id,
                success=True,
                source=ImportSource.OAS,
                message="Successfully imported OAS with complex structures preserved",
                paths_added=len(paths),
                schemas_added=len(schemas),
            )

        except Exception as e:
            return ImportResult(
                spec_id=spec_id,
                success=False,
                source=ImportSource.OAS,
                message=f"Unexpected error during import: {str(e)}",
                errors=[
                    ImportError(
                        code="UNEXPECTED_ERROR",
                        message=str(e),
                    )
                ],
            )

    async def _convert_csv_to_oas(
        self,
        csv_content: str,
        profile: str = "basic",
    ) -> Dict[str, Any]:
        """
        Convert CSV content to OAS dictionary.

        Args:
            csv_content: CSV content
            profile: CSV profile level

        Returns:
            OAS dictionary
        """
        return await self.csv_converter.convert(
            csv_content=csv_content,
            profile=profile,
        )


# Convenient imports
__all__ = [
    "ImportWorkflow",
    "ImportResult",
    "ImportError",
    "ImportSource",
]
