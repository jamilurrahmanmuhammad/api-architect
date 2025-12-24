"""
T009: OAS API Models and Data Transfer Objects (DTOs).

Defines request/response schemas for OAS API endpoints.

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


# ============================================================================
# Specification Models
# ============================================================================


class CreateSpecificationRequest(BaseModel):
    """Request to create a new specification."""

    api_title: str = Field(..., description="API title")
    oas_content: str = Field(..., description="OpenAPI specification content")
    content_format: str = Field(default="yaml", description="Format: yaml or json")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")


class SpecificationResponse(BaseModel):
    """Response for a specification."""

    spec_id: UUID = Field(..., description="Unique specification ID")
    api_title: str = Field(..., description="API title")
    oas_content: str = Field(..., description="OpenAPI specification content")
    content_format: str = Field(..., description="Content format (yaml/json)")
    version: int = Field(default=1, description="Specification version")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")


class UpdateSpecificationRequest(BaseModel):
    """Request to update a specification."""

    oas_content: str = Field(..., description="Updated OpenAPI specification")
    content_format: str = Field(default="yaml", description="Format: yaml or json")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")


class SpecificationListResponse(BaseModel):
    """Response for listing specifications."""

    items: List[SpecificationResponse] = Field(..., description="List of specifications")
    total: int = Field(..., description="Total count")
    limit: int = Field(default=20, description="Items per page")
    offset: int = Field(default=0, description="Pagination offset")


# ============================================================================
# CSV Import/Export Models
# ============================================================================


class CSVImportRequest(BaseModel):
    """Request to import CSV data into specification."""

    data_type: str = Field(..., description="Data type: api-info, servers, models, operations")
    csv_content: str = Field(..., description="CSV content")
    profile: str = Field(default="basic", description="CSV profile: basic, advanced, technical, expert")
    merge: bool = Field(default=False, description="Whether to merge with existing data")


class CSVImportResponse(BaseModel):
    """Response from CSV import."""

    spec_id: UUID = Field(..., description="Specification ID")
    data_type: str = Field(..., description="Data type imported")
    rows_imported: int = Field(..., description="Number of rows imported")
    merged: bool = Field(..., description="Whether data was merged")
    oas_content: str = Field(..., description="Updated OAS content")


class CSVExportRequest(BaseModel):
    """Request to export specification to CSV."""

    data_type: str = Field(..., description="Data type: api-info, servers, models, operations")
    profile: str = Field(default="basic", description="CSV profile level")


class CSVExportResponse(BaseModel):
    """Response from CSV export."""

    spec_id: UUID = Field(..., description="Specification ID")
    data_type: str = Field(..., description="Data type")
    csv_content: str = Field(..., description="CSV content")


# ============================================================================
# Validation Models
# ============================================================================


class ValidationErrorDetail(BaseModel):
    """Details about a validation error."""

    path: str = Field(..., description="JSON path to error location")
    message: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error type")
    severity: str = Field(default="error", description="Severity: error, warning")


class ValidationResponse(BaseModel):
    """Response from validation."""

    is_valid: bool = Field(..., description="Whether specification is valid")
    oas_version: str = Field(..., description="OAS version detected")
    errors: List[ValidationErrorDetail] = Field(default_factory=list, description="List of errors")
    warnings: List[ValidationErrorDetail] = Field(default_factory=list, description="List of warnings")


# ============================================================================
# Transaction Models
# ============================================================================


class TransactionRequest(BaseModel):
    """Request to apply a transaction."""

    edit_path: str = Field(..., description="JSONPointer path to edit")
    old_value: Optional[str] = Field(None, description="Previous value (for validation)")
    new_value: Optional[str] = Field(None, description="New value as JSON string")
    change_type: str = Field(..., description="Type: update, create, delete")


class TransactionResponse(BaseModel):
    """Response for a transaction."""

    transaction_id: UUID = Field(..., description="Transaction ID")
    spec_id: UUID = Field(..., description="Specification ID")
    edit_path: str = Field(..., description="JSONPointer path")
    change_type: str = Field(..., description="Change type")
    timestamp: datetime = Field(..., description="Transaction timestamp")
    old_value: Optional[str] = Field(None, description="Previous value")
    new_value: Optional[str] = Field(None, description="New value")


class TransactionListResponse(BaseModel):
    """Response for listing transactions."""

    transactions: List[TransactionResponse] = Field(..., description="List of transactions")
    total: int = Field(..., description="Total count")
    spec_id: UUID = Field(..., description="Specification ID")


# ============================================================================
# Merge/Diff Models
# ============================================================================


class MergeRequest(BaseModel):
    """Request to merge transactions."""

    transactions: List[TransactionRequest] = Field(..., description="Transactions to merge")


class MergeResponse(BaseModel):
    """Response from merge operation."""

    spec_id: UUID = Field(..., description="Specification ID")
    oas_content: str = Field(..., description="Merged OAS content")
    edits_applied: int = Field(..., description="Number of edits applied")
    edits_failed: List[str] = Field(default_factory=list, description="Failed edits")


class DiffRequest(BaseModel):
    """Request to compute diff."""

    original: str = Field(..., description="Original OAS content")
    updated: str = Field(..., description="Updated OAS content")
    format: str = Field(default="yaml", description="Content format")


class DiffChange(BaseModel):
    """A single diff change."""

    path: str = Field(..., description="JSON path to change")
    change_type: str = Field(..., description="Change type: added, removed, modified")
    original_value: Optional[Any] = Field(None, description="Original value")
    new_value: Optional[Any] = Field(None, description="New value")


class DiffResponse(BaseModel):
    """Response from diff computation."""

    changes: List[DiffChange] = Field(..., description="List of changes")
    summary: Dict[str, int] = Field(..., description="Change summary (counts by type)")


# ============================================================================
# Documentation Models
# ============================================================================


class DocumentationRequest(BaseModel):
    """Request to generate documentation."""

    format: str = Field(default="markdown", description="Format: markdown, html")
    style: Optional[str] = Field(None, description="HTML style: compact, professional, modern")
    include_toc: bool = Field(default=False, description="Include table of contents")


class DocumentationResponse(BaseModel):
    """Response with generated documentation."""

    spec_id: UUID = Field(..., description="Specification ID")
    format: str = Field(..., description="Documentation format")
    content: str = Field(..., description="Generated documentation content")
    generated_at: datetime = Field(..., description="Generation timestamp")


# ============================================================================
# Error Response Models
# ============================================================================


class ErrorDetail(BaseModel):
    """Error detail."""

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")


class ErrorResponse(BaseModel):
    """Error response."""

    error: ErrorDetail = Field(..., description="Error information")
    timestamp: datetime = Field(..., description="Error timestamp")


# ============================================================================
# Import Workflow Models
# ============================================================================


class ImportErrorDetail(BaseModel):
    """Details about an import error."""

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class ImportStatistics(BaseModel):
    """Statistics from an import operation."""

    rows_imported: int = Field(default=0, description="Number of CSV rows imported")
    paths_added: int = Field(default=0, description="Number of API paths added")
    paths_updated: int = Field(default=0, description="Number of API paths updated")
    schemas_added: int = Field(default=0, description="Number of schemas added")
    schemas_updated: int = Field(default=0, description="Number of schemas updated")


class ImportResult(BaseModel):
    """Result of an import operation."""

    spec_id: UUID = Field(..., description="Specification ID")
    success: bool = Field(..., description="Whether import succeeded")
    source: str = Field(..., description="Import source (csv, oas, yaml, json)")
    message: str = Field(..., description="Summary message")
    errors: List[ImportErrorDetail] = Field(default_factory=list, description="List of errors if any")
    stats: ImportStatistics = Field(..., description="Import statistics")
    timestamp: datetime = Field(..., description="Import timestamp")


class CSVImportRequest(BaseModel):
    """Request to import CSV file."""

    csv_content: str = Field(..., description="CSV file content")
    spec_id: UUID = Field(..., description="Specification ID")
    api_title: Optional[str] = Field(None, description="API title for new specs")
    profile: str = Field(default="basic", description="CSV profile (basic, advanced, technical, expert)")
    merge: bool = Field(default=False, description="Whether to merge with existing spec")


class OASImportRequest(BaseModel):
    """Request to import OAS file."""

    oas_content: str = Field(..., description="OAS file content")
    spec_id: UUID = Field(..., description="Specification ID")
    content_format: str = Field(default="json", description="Content format (json or yaml)")
    merge: bool = Field(default=False, description="Whether to merge with existing spec")


# ============================================================================
# Undo/Redo Models
# ============================================================================


class TransactionEntry(BaseModel):
    """A single transaction in undo/redo history."""

    edit_path: str = Field(..., description="JSONPointer path to edited field")
    old_value: Optional[str] = Field(None, description="Previous value")
    new_value: Optional[str] = Field(None, description="New value")
    change_type: str = Field(default="update", description="Type: create, update, delete")
    timestamp: datetime = Field(..., description="Edit timestamp")
    edited_by: Optional[str] = Field(None, description="User who made the edit")
    session_id: Optional[str] = Field(None, description="Session identifier")


class UndoRedoStatusResponse(BaseModel):
    """Response for undo/redo status query."""

    spec_id: UUID = Field(..., description="Specification ID")
    can_undo: bool = Field(..., description="Whether undo is available")
    can_redo: bool = Field(..., description="Whether redo is available")
    undo_stack_size: int = Field(..., description="Current undo stack size")
    redo_stack_size: int = Field(..., description="Current redo stack size")
    max_stack_size: int = Field(..., description="Maximum stack size limit")


class UndoRedoHistoryResponse(BaseModel):
    """Response for undo/redo history query."""

    spec_id: UUID = Field(..., description="Specification ID")
    history: List[TransactionEntry] = Field(..., description="Transaction history")
    total: int = Field(..., description="Total transactions in history")
    limit: Optional[int] = Field(None, description="Pagination limit")
    offset: Optional[int] = Field(None, description="Pagination offset")


class UndoRedoTransactionResponse(BaseModel):
    """Response for undo/redo operations."""

    spec_id: UUID = Field(..., description="Specification ID")
    success: bool = Field(..., description="Whether operation succeeded")
    transaction: Optional[TransactionEntry] = Field(None, description="Transaction that was undone/redone")
    message: str = Field(..., description="Operation result message")


class UndoRedoClearResponse(BaseModel):
    """Response for clearing undo/redo history."""

    spec_id: UUID = Field(..., description="Specification ID")
    success: bool = Field(..., description="Whether operation succeeded")
    message: str = Field(..., description="Operation result message")


# ============================================================================
# Health Check Models
# ============================================================================


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Status: healthy, degraded, unhealthy")
    version: str = Field(..., description="API version")
    services: Dict[str, str] = Field(..., description="Service health status")
