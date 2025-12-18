/**
 * T024: GREEN - User types from data-model.md.
 */

import type { ThemeMode } from './theme';

export interface UserPreferences {
  theme: ThemeMode;
}

export interface UserSession {
  id: string;
  userId: string;
  name: string;
  email: string;
  isAuthenticated: boolean;
  preferences: UserPreferences;
  createdAt: string;
}

export const MOCK_USER: UserSession = {
  id: 'session-001',
  userId: 'user-001',
  name: 'Test User',
  email: 'test@example.com',
  isAuthenticated: true,
  preferences: { theme: 'system' },
  createdAt: new Date().toISOString(),
};
