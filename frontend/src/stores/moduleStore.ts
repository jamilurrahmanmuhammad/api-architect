/**
 * Module store with Zustand.
 * T061: GREEN - Module state management.
 */

import { create } from 'zustand';
import type { Module } from '@/types/module';
import { moduleService } from '@/services/moduleService';

interface ModuleState {
  modules: Module[];
  selectedModule: Module | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchModules: () => Promise<void>;
  selectModule: (moduleId: string | null) => void;
  getEnabledModules: () => Module[];
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: [],
  selectedModule: null,
  isLoading: false,
  error: null,

  fetchModules: async () => {
    set({ isLoading: true, error: null });
    try {
      const modules = await moduleService.listModules();
      set({ modules, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load modules';
      set({ error: message, isLoading: false });
    }
  },

  selectModule: (moduleId: string | null) => {
    if (moduleId === null) {
      set({ selectedModule: null });
      return;
    }
    const module = get().modules.find((m) => m.id === moduleId) || null;
    set({ selectedModule: module });
  },

  getEnabledModules: () => {
    return get().modules.filter((m) => m.enabled);
  },
}));
