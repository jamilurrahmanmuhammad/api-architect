/**
 * Unit tests for authStore.
 * T097: RED - Auth store tests.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock authService
vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('initial state', () => {
    it('should have null user initially', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should have isAuthenticated false initially', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should have null token initially', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
    });
  });

  describe('login', () => {
    it('should set user and token on successful login', async () => {
      const { authService } = await import('@/services/authService');
      const mockUser = {
        id: 'session-001',
        userId: 'user-001',
        name: 'Test User',
        email: 'test@example.com',
        isAuthenticated: true,
        preferences: { theme: 'system' },
      };

      vi.mocked(authService.login).mockResolvedValue({
        token: 'mock-token',
        user: mockUser,
      });

      const { useAuthStore } = await import('@/stores/authStore');
      await useAuthStore.getState().login('test@example.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('mock-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set error on failed login', async () => {
      const { authService } = await import('@/services/authService');
      vi.mocked(authService.login).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { useAuthStore } = await import('@/stores/authStore');
      await useAuthStore.getState().login('wrong@example.com', 'wrongpass');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user and token on logout', async () => {
      const { authService } = await import('@/services/authService');
      const mockUser = {
        id: 'session-001',
        userId: 'user-001',
        name: 'Test User',
        email: 'test@example.com',
        isAuthenticated: true,
        preferences: { theme: 'system' },
      };

      vi.mocked(authService.login).mockResolvedValue({
        token: 'mock-token',
        user: mockUser,
      });
      vi.mocked(authService.logout).mockResolvedValue(undefined);

      const { useAuthStore } = await import('@/stores/authStore');
      await useAuthStore.getState().login('test@example.com', 'password123');
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('token persistence', () => {
    it('should persist token to localStorage', async () => {
      const { authService } = await import('@/services/authService');
      const mockUser = {
        id: 'session-001',
        userId: 'user-001',
        name: 'Test User',
        email: 'test@example.com',
        isAuthenticated: true,
        preferences: { theme: 'system' },
      };

      vi.mocked(authService.login).mockResolvedValue({
        token: 'mock-token',
        user: mockUser,
      });

      const { useAuthStore } = await import('@/stores/authStore');
      await useAuthStore.getState().login('test@example.com', 'password123');

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});
