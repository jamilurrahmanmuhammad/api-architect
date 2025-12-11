/**
 * Module service for API calls.
 * T060: GREEN - Module API service.
 */

import { apiClient } from './api';
import type { Module } from '@/types/module';

export const moduleService = {
  /**
   * List all modules.
   * @param enabled - Optional filter for enabled status
   */
  async listModules(enabled?: boolean): Promise<Module[]> {
    const params = enabled !== undefined ? `?enabled=${enabled}` : '';
    const response = await apiClient.get<Module[]>(`/modules${params}`);
    return response.data;
  },

  /**
   * Get a single module by ID.
   * @param moduleId - The module identifier
   */
  async getModule(moduleId: string): Promise<Module> {
    const response = await apiClient.get<Module>(`/modules/${moduleId}`);
    return response.data;
  },
};
