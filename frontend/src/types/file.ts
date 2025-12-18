/**
 * T036: File types for Requirements Grammar files.
 */

export interface RequirementFile {
  id: string;
  name: string;
  content: string;
  version: number;
  status: FileStatus;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export type FileStatus = 'draft' | 'reviewing' | 'approved' | 'published';

export interface FileCreateRequest {
  name: string;
  content?: string;
}

export interface FileUpdateRequest {
  content: string;
}

export interface FileListResponse {
  files: RequirementFile[];
  total: number;
  page: number;
  page_size: number;
}

export interface FileListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: FileStatus;
}
