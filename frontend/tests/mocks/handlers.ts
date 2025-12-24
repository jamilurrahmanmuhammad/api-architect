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

  // Parse DSL content
  http.post('*/api/v1/parse', async ({ request }) => {
    const body = (await request.json()) as { content: string };
    const content = body.content || '';

    // Simple parsing logic for testing
    const services: Array<{
      name: string;
      version: string;
      base_path: string;
      description: string | null;
      location: { line: number; column: number };
    }> = [];
    const models: Array<{
      name: string;
      description: string | null;
      fields: Array<{
        name: string;
        type: string;
        required: boolean;
        location: { line: number; column: number };
      }>;
      location: { line: number; column: number };
    }> = [];
    const operations: Array<{
      method: string;
      path: string;
      description: string | null;
      location: { line: number; column: number };
    }> = [];
    const errors: Array<{
      status_code: number;
      name: string;
      description: string | null;
      location: { line: number; column: number };
    }> = [];

    // Parse services
    const serviceMatches = content.matchAll(/# Service:\s*(\w+)/g);
    let lineNum = 1;
    for (const match of serviceMatches) {
      services.push({
        name: match[1],
        version: '1.0.0',
        base_path: '/api',
        description: null,
        location: { line: lineNum, column: 1 },
      });
      lineNum++;
    }

    // Parse models
    const modelMatches = content.matchAll(/## Model:\s*(\w+)/g);
    for (const match of modelMatches) {
      models.push({
        name: match[1],
        description: null,
        fields: [],
        location: { line: lineNum, column: 1 },
      });
      lineNum++;
    }

    // Parse operations
    const opMatches = content.matchAll(/## Operation:\s*(GET|POST|PUT|DELETE)\s+(\S+)/g);
    for (const match of opMatches) {
      operations.push({
        method: match[1],
        path: match[2],
        description: null,
        location: { line: lineNum, column: 1 },
      });
      lineNum++;
    }

    // Parse errors
    const errorMatches = content.matchAll(/## Error:\s*(\d+)\s+(\w+)/g);
    for (const match of errorMatches) {
      errors.push({
        status_code: parseInt(match[1]),
        name: match[2],
        description: null,
        location: { line: lineNum, column: 1 },
      });
      lineNum++;
    }

    const valid_entities = services.length + models.length + operations.length + errors.length;

    return HttpResponse.json({
      services,
      models,
      operations,
      errors,
      parse_errors: [],
      valid_entities,
      total_errors: 0,
    });
  }),

  // Validate DSL content
  http.post('*/api/v1/validate', async ({ request }) => {
    const body = (await request.json()) as { content: string };
    const content = body.content || '';

    // Simple validation logic for testing
    const errors: Array<{
      line: number;
      column: number;
      message: string;
      error_type: string;
      severity: string;
      guidance: string | null;
    }> = [];

    // Check for undefined model references
    if (content.includes('UndefinedModel')) {
      errors.push({
        line: 1,
        column: 1,
        message: "Undefined model reference 'UndefinedModel'",
        error_type: 'UNDEFINED_REFERENCE',
        severity: 'error',
        guidance: 'Define the model before referencing it',
      });
    }

    // Check for invalid types
    if (content.includes('invalidtype')) {
      errors.push({
        line: 1,
        column: 1,
        message: "Invalid type 'invalidtype'",
        error_type: 'INVALID_TYPE',
        severity: 'error',
        guidance: 'Use valid types like string, integer, boolean',
      });
    }

    // Check for duplicate models
    const modelMatches = content.match(/## Model:\s*(\w+)/g) || [];
    const modelNames = modelMatches.map((m) => m.replace('## Model:', '').trim());
    const seen = new Set<string>();
    for (const name of modelNames) {
      if (seen.has(name)) {
        errors.push({
          line: 1,
          column: 1,
          message: `Duplicate model '${name}'`,
          error_type: 'DUPLICATE_ENTITY',
          severity: 'error',
          guidance: 'Use unique model names',
        });
      }
      seen.add(name);
    }

    return HttpResponse.json({
      valid: errors.length === 0,
      errors,
      error_count: errors.length,
      warning_count: 0,
    });
  }),

  // Export to OpenAPI
  http.post('*/api/v1/export', async ({ request }) => {
    const body = (await request.json()) as {
      content: string;
      format: 'yaml' | 'json';
      version: '3.0' | '3.1';
    };

    const { content, format, version } = body;

    if (!content || !content.trim()) {
      return HttpResponse.json(
        { detail: 'Content is empty' },
        { status: 422 }
      );
    }

    // Generate simple mock OpenAPI spec
    const spec = {
      openapi: version === '3.1' ? '3.1.0' : '3.0.3',
      info: {
        title: 'Mock API',
        version: '1.0.0',
      },
      paths: {},
    };

    if (format === 'json') {
      return HttpResponse.json(spec, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename=openapi.json',
        },
      });
    } else {
      // Return YAML-like string for testing
      const yamlContent = `openapi: '${spec.openapi}'
info:
  title: ${spec.info.title}
  version: ${spec.info.version}
paths: {}`;

      return new HttpResponse(yamlContent, {
        headers: {
          'Content-Type': 'application/x-yaml',
          'Content-Disposition': 'attachment; filename=openapi.yaml',
        },
      });
    }
  }),
];
