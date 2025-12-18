/**
 * Integration tests for LoginPage.
 * T099: RED - LoginPage integration tests.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('LoginPage', () => {
  beforeEach(async () => {
    // Reset auth store
    const { useAuthStore } = await import('@/stores/authStore');
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  const renderLoginPage = async () => {
    const { LoginPage } = await import('@/pages/LoginPage');
    return render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div>Dashboard</div>} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('rendering', () => {
    it('should render login form', async () => {
      await renderLoginPage();

      // Check for form elements - multiple "Sign in" elements exist (title + button)
      const signInElements = screen.getAllByText('Sign in');
      expect(signInElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should have accessible form fields', async () => {
      await renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('form submission', () => {
    it('should submit form with valid credentials', async () => {
      const user = userEvent.setup();
      await renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should show error for invalid credentials', async () => {
      server.use(
        http.post('*/api/v1/auth/login', () => {
          return HttpResponse.json(
            {
              error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
              meta: { requestId: 'test', timestamp: new Date().toISOString() },
            },
            { status: 401 }
          );
        })
      );

      const user = userEvent.setup();
      await renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state during submission', async () => {
      server.use(
        http.post('*/api/v1/auth/login', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            data: {
              token: 'mock-token',
              user: {
                id: 'session-001',
                userId: 'user-001',
                name: 'Test User',
                email: 'test@example.com',
                isAuthenticated: true,
              },
            },
            meta: { requestId: 'test', timestamp: new Date().toISOString() },
          });
        })
      );

      const user = userEvent.setup();
      await renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Button should be disabled during loading (text changes to "Signing in...")
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('navigation', () => {
    it('should have link to go back home', async () => {
      await renderLoginPage();

      const homeLink = screen.getByRole('link', { name: /home|back/i });
      expect(homeLink).toBeInTheDocument();
    });
  });
});
