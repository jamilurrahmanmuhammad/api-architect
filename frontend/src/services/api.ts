/**
 * T023: GREEN - API client base with fetch wrapper.
 */

import type { ApiResponse, ApiErrorResponse } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  private _baseUrl: string;
  private _token: string | null = null;

  constructor(baseUrl: string) {
    this._baseUrl = baseUrl;
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  get token(): string | null {
    return this._token;
  }

  get defaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    return headers;
  }

  setToken(token: string): void {
    this._token = token;
  }

  clearToken(): void {
    this._token = null;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();

    if (!response.ok) {
      const errorResponse = data as ApiErrorResponse;
      throw new ApiError(
        errorResponse.error.code,
        errorResponse.error.message,
        errorResponse.error.details
      );
    }

    return data as ApiResponse<T>;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this._baseUrl}${path}`, {
      method: 'GET',
      headers: this.defaultHeaders,
    });

    return this.handleResponse<T>(response);
  }

  async post<T, B = unknown>(path: string, body?: B): Promise<ApiResponse<T>> {
    const response = await fetch(`${this._baseUrl}${path}`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T, B = unknown>(path: string, body?: B): Promise<ApiResponse<T>> {
    const response = await fetch(`${this._baseUrl}${path}`, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this._baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.defaultHeaders,
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient(`${API_URL}/api/${API_VERSION}`);
