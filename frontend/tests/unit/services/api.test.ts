/**
 * T022: RED - Unit test for API client base configuration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from '@/services/api';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('configuration', () => {
    it('should have correct base URL from environment', () => {
      expect(apiClient.baseUrl).toBe('http://localhost:8765/api/v1');
    });

    it('should include default headers', () => {
      expect(apiClient.defaultHeaders).toMatchObject({
        'Content-Type': 'application/json',
      });
    });
  });

  describe('GET request', () => {
    it('should make GET request to correct URL', async () => {
      const response = await apiClient.get('/health');

      expect(response.data).toBeDefined();
      expect(response.data.status).toBe('healthy');
    });

    it('should include meta in response', async () => {
      const response = await apiClient.get('/health');

      expect(response.meta).toBeDefined();
      expect(response.meta.requestId).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw ApiError for 401 responses', async () => {
      await expect(apiClient.get('/auth/me')).rejects.toThrow(ApiError);
    });

    it('should include error code in ApiError', async () => {
      try {
        await apiClient.get('/auth/me');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('POST request', () => {
    it('should make POST request with body', async () => {
      const response = await apiClient.post('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(response.data).toBeDefined();
      expect(response.data.token).toBeDefined();
    });
  });

  describe('authorization', () => {
    it('should include auth token in headers when set', async () => {
      apiClient.setToken('mock-token-12345');

      const response = await apiClient.get('/auth/me');
      expect(response.data.isAuthenticated).toBe(true);
    });

    it('should clear auth token', () => {
      apiClient.setToken('some-token');
      apiClient.clearToken();

      expect(apiClient.token).toBeNull();
    });
  });
});
