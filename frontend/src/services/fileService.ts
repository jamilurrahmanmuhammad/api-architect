/**
 * T036: File service for managing requirement files.
 */

import type {
  RequirementFile,
  FileCreateRequest,
  FileUpdateRequest,
  FileListResponse,
  FileListParams,
} from '@/types/file';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8765';
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';
const BASE_URL = `${API_URL}/api/${API_VERSION}/files`;

class FileService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async listFiles(params: FileListParams = {}): Promise<FileListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', params.page.toString());
    if (params.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return this.handleResponse<FileListResponse>(response);
  }

  async getFile(id: string): Promise<RequirementFile> {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return this.handleResponse<RequirementFile>(response);
  }

  async createFile(data: FileCreateRequest): Promise<RequirementFile> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return this.handleResponse<RequirementFile>(response);
  }

  async updateFile(id: string, data: FileUpdateRequest): Promise<RequirementFile> {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return this.handleResponse<RequirementFile>(response);
  }

  async deleteFile(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    return this.handleResponse<void>(response);
  }
}

export const fileService = new FileService();
