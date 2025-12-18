/**
 * T031/T043/T066/T108: GREEN - React Router configuration.
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { FilesPage } from './pages/FilesPage';
import { EditorPage } from './pages/EditorPage';

// Module placeholder pages
const ApiDesignModule = () => (
  <div>
    <h1 className="text-2xl font-bold">API Design</h1>
    <p className="text-muted-foreground">Design and document RESTful APIs</p>
  </div>
);
const DataModelingModule = () => (
  <div>
    <h1 className="text-2xl font-bold">Data Modeling</h1>
    <p className="text-muted-foreground">Create database schemas</p>
  </div>
);
const CodeGenerationModule = () => (
  <div>
    <h1 className="text-2xl font-bold">Code Generation</h1>
    <p className="text-muted-foreground">Generate boilerplate code</p>
  </div>
);
const DocumentationModule = () => (
  <div>
    <h1 className="text-2xl font-bold">Documentation</h1>
    <p className="text-muted-foreground">Auto-generate API docs</p>
  </div>
);
const TestingModule = () => (
  <div>
    <h1 className="text-2xl font-bold">Testing</h1>
    <p className="text-muted-foreground">Create and run API tests</p>
  </div>
);

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Authenticated routes with AppLayout (wrapped in ProtectedRoute)
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'api-design',
        element: <ApiDesignModule />,
      },
      {
        path: 'data-modeling',
        element: <DataModelingModule />,
      },
      {
        path: 'code-generation',
        element: <CodeGenerationModule />,
      },
      {
        path: 'documentation',
        element: <DocumentationModule />,
      },
      {
        path: 'testing',
        element: <TestingModule />,
      },
      {
        path: 'files',
        element: <FilesPage />,
      },
    ],
  },

  // Full-screen editor route (authenticated)
  {
    path: '/editor/:fileId',
    element: (
      <ProtectedRoute>
        <EditorPage />
      </ProtectedRoute>
    ),
  },
  // Files list route (authenticated, standalone)
  {
    path: '/files',
    element: (
      <ProtectedRoute>
        <FilesPage />
      </ProtectedRoute>
    ),
  },

  // Catch-all 404
  {
    path: '/404',
    element: <NotFound />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
]);
