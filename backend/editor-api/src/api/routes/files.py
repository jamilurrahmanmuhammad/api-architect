"""
Files API Routes - CRUD endpoints for requirement files.

Implements:
- T031: GET /files - List files with pagination
- T032: POST /files - Create new file
- T033: GET /files/{fileId} - Get single file
- T034: PUT /files/{fileId} - Update file
- T035: DELETE /files/{fileId} - Soft delete file
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response

from src.db.database import get_db
from src.db.repository import FileRepository
from src.models.schemas import (
    RequirementFileCreateRequest,
    RequirementFileUpdateRequest,
    RequirementFileResponse,
    RequirementFileListResponse,
)
from src.services.file_service import (
    FileService,
    FileNotFoundError,
    FileNameExistsError,
    FileValidationError,
)


router = APIRouter(prefix="/files", tags=["files"])


# =============================================================================
# Dependencies
# =============================================================================


async def get_file_service(session=Depends(get_db)) -> FileService:
    """Create FileService instance with database session."""
    repository = FileRepository(session)
    return FileService(repository)


# =============================================================================
# T031: GET /files - List files with pagination and filtering
# =============================================================================


@router.get(
    "",
    response_model=RequirementFileListResponse,
    summary="List all files",
    description="Get a paginated list of requirement files with optional filtering.",
)
async def list_files(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(default=None, description="Search by file name"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    service: FileService = Depends(get_file_service),
) -> RequirementFileListResponse:
    """
    List all requirement files with pagination.

    - **page**: Page number (starts at 1)
    - **page_size**: Number of items per page (max 100)
    - **search**: Optional search term for file name
    - **status**: Optional filter by status (draft, reviewing, approved, published)
    """
    offset = (page - 1) * page_size

    result = await service.list_files(
        limit=page_size,
        offset=offset,
        status=status,
    )

    # Convert to response model
    files = [RequirementFileResponse.model_validate(f) for f in result["files"]]

    return RequirementFileListResponse(
        files=files,
        total=result["total"],
        page=page,
        page_size=page_size,
    )


# =============================================================================
# T032: POST /files - Create new file
# =============================================================================


@router.post(
    "",
    response_model=RequirementFileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new file",
    description="Create a new requirement file with the given name and content.",
)
async def create_file(
    request: RequirementFileCreateRequest,
    service: FileService = Depends(get_file_service),
) -> RequirementFileResponse:
    """
    Create a new requirement file.

    - **name**: File name (must be unique)
    - **content**: Initial DSL content (can be empty)
    """
    try:
        file = await service.create_file(
            name=request.name,
            content=request.content,
        )
        return RequirementFileResponse.model_validate(file)
    except FileNameExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except FileValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


# =============================================================================
# T033: GET /files/{file_id} - Get single file
# =============================================================================


@router.get(
    "/{file_id}",
    response_model=RequirementFileResponse,
    summary="Get a file by ID",
    description="Retrieve a single requirement file by its unique identifier.",
)
async def get_file(
    file_id: UUID,
    service: FileService = Depends(get_file_service),
) -> RequirementFileResponse:
    """
    Get a requirement file by its ID.

    - **file_id**: UUID of the file to retrieve
    """
    try:
        file = await service.get_file(str(file_id))
        return RequirementFileResponse.model_validate(file)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID '{file_id}' not found",
        )


# =============================================================================
# T034: PUT /files/{file_id} - Update file
# =============================================================================


@router.put(
    "/{file_id}",
    response_model=RequirementFileResponse,
    summary="Update a file",
    description="Update the content of an existing requirement file. Version is auto-incremented.",
)
async def update_file(
    file_id: UUID,
    request: RequirementFileUpdateRequest,
    service: FileService = Depends(get_file_service),
) -> RequirementFileResponse:
    """
    Update a requirement file's content.

    - **file_id**: UUID of the file to update
    - **content**: New DSL content

    The version number is automatically incremented on each update.
    """
    try:
        file = await service.update_file(
            file_id=str(file_id),
            content=request.content,
        )
        return RequirementFileResponse.model_validate(file)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID '{file_id}' not found",
        )
    except FileValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


# =============================================================================
# T035: DELETE /files/{file_id} - Soft delete file
# =============================================================================


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a file",
    description="Soft delete a requirement file. The file will no longer appear in listings.",
)
async def delete_file(
    file_id: UUID,
    service: FileService = Depends(get_file_service),
) -> Response:
    """
    Delete a requirement file (soft delete).

    - **file_id**: UUID of the file to delete

    The file is marked as deleted but not permanently removed from the database.
    """
    try:
        await service.delete_file(str(file_id))
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID '{file_id}' not found",
        )
