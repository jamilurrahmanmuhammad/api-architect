/**
 * useModules hook for module data access.
 * T062: GREEN - Module hook.
 */

import { useEffect } from 'react';
import { useModuleStore } from '@/stores/moduleStore';

export function useModules() {
  const modules = useModuleStore((state) => state.modules);
  const selectedModule = useModuleStore((state) => state.selectedModule);
  const isLoading = useModuleStore((state) => state.isLoading);
  const error = useModuleStore((state) => state.error);
  const fetchModules = useModuleStore((state) => state.fetchModules);
  const selectModule = useModuleStore((state) => state.selectModule);
  const getEnabledModules = useModuleStore((state) => state.getEnabledModules);

  useEffect(() => {
    if (modules.length === 0 && !isLoading && !error) {
      fetchModules();
    }
  }, [modules.length, isLoading, error, fetchModules]);

  return {
    modules,
    enabledModules: getEnabledModules(),
    selectedModule,
    isLoading,
    error,
    selectModule,
    refetch: fetchModules,
  };
}
