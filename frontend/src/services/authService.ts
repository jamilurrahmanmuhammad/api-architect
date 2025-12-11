/**
 * Authentication service for API calls.
 * T102: GREEN - Auth API service.
 */

import { apiClient } from './api';

export interface UserSession {
  id: string;
  userId: string;
  name: string;
  email: string;
  isAuthenticated: boolean;
  preferences: {
    theme: string;
  };
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: UserSession;
}

export const authService = {
  /**
   * Login with email and password.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Logout current user.
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout', {});
  },

  /**
   * Get current authenticated user.
   */
  async getCurrentUser(): Promise<UserSession> {
    const response = await apiClient.get<UserSession>('/auth/me');
    return response.data;
  },
};
