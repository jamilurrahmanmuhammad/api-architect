/**
 * TanStack Query hooks for Editor API integration.
 *
 * Provides:
 * - File CRUD operations (list, get, create, update, delete)
 * - DSL parsing and validation
 * - File export
 * - Automatic caching and background refetching
 * - Error handling and retry logic
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8765/api/v1";

/**
 * Query keys for cache invalidation and organization.
 */
export const editorQueryKeys = {
  all: ["editor"] as const,
  files: () => [...editorQueryKeys.all, "files"] as const,
  file: (id: string) => [...editorQueryKeys.files(), id] as const,
  parse: () => [...editorQueryKeys.all, "parse"] as const,
  validate: () => [...editorQueryKeys.all, "validate"] as const,
  export: () => [...editorQueryKeys.all, "export"] as const,
};

/**
 * API type definitions matching backend schemas.
 */
export interface RequirementFile {
  id: string;
  name: string;
  content: string;
  version: number;
  status: "draft" | "reviewing" | "approved" | "published";
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface FileListResponse {
  files: RequirementFile[];
  total: number;
  page: number;
  page_size: number;
}

export interface ParseError {
  line: number;
  column: number;
  error_type: string;
  message: string;
  guidance?: string;
}

export interface ParsedEntity {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface ParseResponse {
  services: ParsedEntity[];
  models: ParsedEntity[];
  operations: ParsedEntity[];
  errors: ParsedEntity[];
  parse_errors: ParseError[];
  partial: boolean;
}

export interface ValidateResponse {
  valid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
}

export interface ExportResponse {
  metadata?: {
    file_id: string;
    file_name: string;
    exported_at: string;
    version: number;
    dsl_version: string;
  };
  services: ParsedEntity[];
  models: ParsedEntity[];
  operations: ParsedEntity[];
  errors: ParsedEntity[];
}

/**
 * Hook: Fetch all requirement files with pagination.
 */
export function useFileList(page: number = 1, pageSize: number = 10) {
  return useQuery({
    queryKey: [...editorQueryKeys.files(), { page, pageSize }],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/files?page=${page}&page_size=${pageSize}`
      );
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json() as Promise<FileListResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook: Fetch a single requirement file by ID.
 */
export function useFile(fileId: string | null) {
  return useQuery({
    queryKey: fileId ? editorQueryKeys.file(fileId) : ["disabled"],
    queryFn: async () => {
      if (!fileId) throw new Error("File ID required");
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`);
      if (!response.ok) throw new Error("Failed to fetch file");
      return response.json() as Promise<RequirementFile>;
    },
    enabled: !!fileId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook: Create a new requirement file.
 */
export function useCreateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; content?: string }) => {
      const response = await fetch(`${API_BASE_URL}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create file");
      return response.json() as Promise<RequirementFile>;
    },
    onSuccess: () => {
      // Invalidate file list to refetch with new file
      queryClient.invalidateQueries({ queryKey: editorQueryKeys.files() });
    },
  });
}

/**
 * Hook: Update an existing requirement file.
 */
export function useUpdateFile(fileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to update file");
      return response.json() as Promise<RequirementFile>;
    },
    onSuccess: () => {
      // Invalidate both the specific file and file list
      queryClient.invalidateQueries({
        queryKey: editorQueryKeys.file(fileId),
      });
      queryClient.invalidateQueries({ queryKey: editorQueryKeys.files() });
    },
  });
}

/**
 * Hook: Delete a requirement file.
 */
export function useDeleteFile(fileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete file");
      return response.ok;
    },
    onSuccess: () => {
      // Invalidate file list to remove deleted file
      queryClient.invalidateQueries({ queryKey: editorQueryKeys.files() });
      queryClient.removeQueries({
        queryKey: editorQueryKeys.file(fileId),
      });
    },
  });
}

/**
 * Hook: Parse DSL content.
 */
export function useParse(content: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...editorQueryKeys.parse(), { content }],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to parse DSL");
      return response.json() as Promise<ParseResponse>;
    },
    enabled: enabled && content.length > 0,
    staleTime: 0, // Always fresh for parse results
    gcTime: 5 * 60 * 1000, // Keep results for 5 minutes
  });
}

/**
 * Hook: Validate DSL content.
 */
export function useValidate(content: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...editorQueryKeys.validate(), { content }],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to validate DSL");
      return response.json() as Promise<ValidateResponse>;
    },
    enabled: enabled && content.length > 0,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Export requirement file.
 */
export function useExport(fileId: string) {
  return useMutation({
    mutationFn: async (format: "json" | "yaml" = "json") => {
      const response = await fetch(`${API_BASE_URL}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, format }),
      });
      if (!response.ok) throw new Error("Failed to export file");
      return response.json() as Promise<ExportResponse>;
    },
  });
}

/**
 * Setup TanStack Query client.
 */
export function createQueryClientConfig() {
  return {
    defaultOptions: {
      queries: {
        retry: 1,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
      },
    },
  };
}
