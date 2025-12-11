/**
 * Unit tests for moduleStore.
 * T054: RED - Module store tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API before importing the store
vi.mock('@/services/moduleService', () => ({
  moduleService: {
    listModules: vi.fn(),
    getModule: vi.fn(),
  },
}));

describe('moduleStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    vi.resetModules();
  });

  describe('initial state', () => {
    it('should have empty modules array', async () => {
      const { useModuleStore } = await import('@/stores/moduleStore');
      const state = useModuleStore.getState();
      expect(state.modules).toEqual([]);
    });

    it('should have null selected module', async () => {
      const { useModuleStore } = await import('@/stores/moduleStore');
      const state = useModuleStore.getState();
      expect(state.selectedModule).toBeNull();
    });

    it('should have loading false initially', async () => {
      const { useModuleStore } = await import('@/stores/moduleStore');
      const state = useModuleStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should have null error initially', async () => {
      const { useModuleStore } = await import('@/stores/moduleStore');
      const state = useModuleStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('fetchModules', () => {
    it('should fetch and store modules', async () => {
      const { moduleService } = await import('@/services/moduleService');
      const mockModules = [
        {
          id: 'api-design',
          name: 'API Design',
          description: 'Design APIs',
          icon: 'FileCode',
          route: '/app/api-design',
          enabled: true,
          order: 1,
        },
      ];

      vi.mocked(moduleService.listModules).mockResolvedValue(mockModules);

      const { useModuleStore } = await import('@/stores/moduleStore');
      await useModuleStore.getState().fetchModules();

      const state = useModuleStore.getState();
      expect(state.modules).toEqual(mockModules);
      expect(state.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      const { moduleService } = await import('@/services/moduleService');

      let resolvePromise: (value: unknown[]) => void;
      const pendingPromise = new Promise<unknown[]>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(moduleService.listModules).mockReturnValue(pendingPromise);

      const { useModuleStore } = await import('@/stores/moduleStore');
      const fetchPromise = useModuleStore.getState().fetchModules();

      // Check loading is true during fetch
      expect(useModuleStore.getState().isLoading).toBe(true);

      resolvePromise!([]);
      await fetchPromise;

      expect(useModuleStore.getState().isLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      const { moduleService } = await import('@/services/moduleService');
      vi.mocked(moduleService.listModules).mockRejectedValue(
        new Error('Network error')
      );

      const { useModuleStore } = await import('@/stores/moduleStore');
      await useModuleStore.getState().fetchModules();

      const state = useModuleStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('selectModule', () => {
    it('should select a module by id', async () => {
      const { moduleService } = await import('@/services/moduleService');
      const mockModules = [
        {
          id: 'api-design',
          name: 'API Design',
          description: 'Design APIs',
          icon: 'FileCode',
          route: '/app/api-design',
          enabled: true,
          order: 1,
        },
        {
          id: 'testing',
          name: 'Testing',
          description: 'Test APIs',
          icon: 'FlaskConical',
          route: '/app/testing',
          enabled: true,
          order: 2,
        },
      ];

      vi.mocked(moduleService.listModules).mockResolvedValue(mockModules);

      const { useModuleStore } = await import('@/stores/moduleStore');
      await useModuleStore.getState().fetchModules();
      useModuleStore.getState().selectModule('testing');

      const state = useModuleStore.getState();
      expect(state.selectedModule?.id).toBe('testing');
    });

    it('should clear selection when id is null', async () => {
      const { useModuleStore } = await import('@/stores/moduleStore');
      useModuleStore.getState().selectModule(null);

      const state = useModuleStore.getState();
      expect(state.selectedModule).toBeNull();
    });
  });

  describe('getEnabledModules', () => {
    it('should return only enabled modules', async () => {
      const { moduleService } = await import('@/services/moduleService');
      const mockModules = [
        {
          id: 'api-design',
          name: 'API Design',
          description: 'Design APIs',
          icon: 'FileCode',
          route: '/app/api-design',
          enabled: true,
          order: 1,
        },
        {
          id: 'deployment',
          name: 'Deployment',
          description: 'Deploy APIs',
          icon: 'Rocket',
          route: '/app/deployment',
          enabled: false,
          order: 2,
        },
      ];

      vi.mocked(moduleService.listModules).mockResolvedValue(mockModules);

      const { useModuleStore } = await import('@/stores/moduleStore');
      await useModuleStore.getState().fetchModules();

      const enabledModules = useModuleStore.getState().getEnabledModules();
      expect(enabledModules).toHaveLength(1);
      expect(enabledModules[0].id).toBe('api-design');
    });
  });
});
