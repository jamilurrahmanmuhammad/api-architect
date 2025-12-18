/**
 * T037: FileManager component with list, create, load, delete operations.
 *
 * Provides:
 * - File listing with pagination
 * - Create new file dialog
 * - Load/select file
 * - Delete file with confirmation
 */

import { useState, useEffect, useCallback } from 'react';
import { fileService } from '@/services/fileService';
import type { RequirementFile, FileListParams } from '@/types/file';

export interface FileManagerProps {
  selectedFileId?: string | null;
  onFileSelect?: (file: RequirementFile) => void;
  onFileCreate?: (file: RequirementFile) => void;
  onFileDelete?: (fileId: string) => void;
  className?: string;
}

export function FileManager({
  selectedFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  className,
}: FileManagerProps) {
  const [files, setFiles] = useState<RequirementFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const PAGE_SIZE = 10;

  const fetchFiles = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);

    try {
      const params: FileListParams = {
        page: pageNum,
        page_size: PAGE_SIZE,
      };

      const response = await fileService.listFiles(params);
      setFiles(response.files);
      setTotalPages(Math.ceil(response.total / PAGE_SIZE) || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(page);
  }, [page, fetchFiles]);

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;

    setCreateLoading(true);
    setError(null);

    try {
      const file = await fileService.createFile({
        name: newFileName.trim(),
        content: `# Service: ${newFileName.trim()}\nversion: 1.0.0\n\n# Add your API specification here\n`,
      });

      setShowCreateDialog(false);
      setNewFileName('');
      await fetchFiles(1);
      setPage(1);

      if (onFileCreate) {
        onFileCreate(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeleteLoading(true);
    setError(null);

    try {
      await fileService.deleteFile(fileId);
      setShowDeleteDialog(null);
      await fetchFiles(page);

      if (onFileDelete) {
        onFileDelete(fileId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFileClick = async (file: RequirementFile) => {
    if (onFileSelect) {
      try {
        // Fetch full file content
        const fullFile = await fileService.getFile(file.id);
        onFileSelect(fullFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={`flex flex-col h-full bg-gray-800 text-white ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Files</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
        >
          + New File
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No files yet</p>
            <p className="text-sm mt-1">Create your first file to get started</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {files.map((file) => (
              <li
                key={file.id}
                className={`px-4 py-3 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                  selectedFileId === file.id ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
                }`}
                onClick={() => handleFileClick(file)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      v{file.version} · {formatDate(file.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        file.status === 'draft'
                          ? 'bg-gray-600 text-gray-300'
                          : file.status === 'reviewing'
                          ? 'bg-yellow-600/50 text-yellow-300'
                          : file.status === 'approved'
                          ? 'bg-green-600/50 text-green-300'
                          : 'bg-blue-600/50 text-blue-300'
                      }`}
                    >
                      {file.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(file.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete file"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-700">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            Prev
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            Next
          </button>
        </div>
      )}

      {/* Create file dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter file name"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') setShowCreateDialog(false);
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewFileName('');
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                disabled={!newFileName.trim() || createLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors"
              >
                {createLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-2">Delete File?</h3>
            <p className="text-gray-400 mb-4">
              This action cannot be undone. The file will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteDialog(null)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFile(showDeleteDialog)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileManager;
