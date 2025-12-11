import { http, HttpResponse } from 'msw';

// Use wildcard to match any host (tests may use different ports)
export const handlers = [
  // Health check
  http.get('*/api/v1/health', () => {
    return HttpResponse.json({
      data: {
        status: 'healthy',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }),

  // Modules - list
  http.get('*/api/v1/modules', ({ request }) => {
    const url = new URL(request.url);
    const enabled = url.searchParams.get('enabled');

    const allModules = [
      {
        id: 'api-design',
        name: 'API Design',
        description: 'Design and document RESTful APIs with OpenAPI specifications',
        icon: 'FileCode',
        route: '/app/api-design',
        enabled: true,
        order: 1,
        badge: null,
      },
      {
        id: 'data-modeling',
        name: 'Data Modeling',
        description: 'Create and manage database schemas and entity relationships',
        icon: 'Database',
        route: '/app/data-modeling',
        enabled: true,
        order: 2,
        badge: null,
      },
      {
        id: 'code-generation',
        name: 'Code Generation',
        description: 'Generate boilerplate code from API specifications',
        icon: 'Cpu',
        route: '/app/code-generation',
        enabled: true,
        order: 3,
        badge: 'New',
      },
      {
        id: 'documentation',
        name: 'Documentation',
        description: 'Auto-generate API documentation from specifications',
        icon: 'BookOpen',
        route: '/app/documentation',
        enabled: true,
        order: 4,
        badge: null,
      },
      {
        id: 'testing',
        name: 'Testing',
        description: 'Create and run API tests with automated validation',
        icon: 'FlaskConical',
        route: '/app/testing',
        enabled: true,
        order: 5,
        badge: null,
      },
      {
        id: 'deployment',
        name: 'Deployment',
        description: 'Deploy APIs to cloud platforms with CI/CD integration',
        icon: 'Rocket',
        route: '/app/deployment',
        enabled: false,
        order: 6,
        badge: 'Coming Soon',
      },
    ];

    let modules = allModules;
    if (enabled === 'true') {
      modules = allModules.filter((m) => m.enabled);
    } else if (enabled === 'false') {
      modules = allModules.filter((m) => !m.enabled);
    }

    return HttpResponse.json({
      data: modules,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }),

  // Modules - get by ID
  http.get('*/api/v1/modules/:moduleId', ({ params }) => {
    const { moduleId } = params;
    const allModules = [
      { id: 'api-design', name: 'API Design', description: 'Design APIs', icon: 'FileCode', route: '/app/api-design', enabled: true, order: 1, badge: null },
      { id: 'testing', name: 'Testing', description: 'Test APIs', icon: 'FlaskConical', route: '/app/testing', enabled: true, order: 5, badge: null },
    ];
    const module = allModules.find((m) => m.id === moduleId);
    if (!module) {
      return HttpResponse.json(
        {
          error: { code: 'NOT_FOUND', message: `Module '${moduleId}' not found` },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      data: module,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    });
  }),

  // Auth - Login
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'test@example.com') {
      return HttpResponse.json({
        data: {
          user: {
            id: 'session-001',
            userId: 'user-001',
            name: 'Test User',
            email: 'test@example.com',
            isAuthenticated: true,
            preferences: { theme: 'system' },
            createdAt: new Date().toISOString(),
          },
          token: 'mock-token-12345',
        },
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      });
    }
    return HttpResponse.json(
      {
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 400 }
    );
  }),

  // Auth - Current user
  http.get('*/api/v1/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'Bearer mock-token-12345') {
      return HttpResponse.json({
        data: {
          id: 'session-001',
          userId: 'user-001',
          name: 'Test User',
          email: 'test@example.com',
          isAuthenticated: true,
          preferences: { theme: 'system' },
          createdAt: new Date().toISOString(),
        },
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      });
    }
    return HttpResponse.json(
      {
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 401 }
    );
  }),

  // Auth - Logout
  http.post('*/api/v1/auth/logout', () => {
    return HttpResponse.json({
      data: { message: 'Successfully logged out' },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }),
];
