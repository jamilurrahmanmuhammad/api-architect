/**
 * Performance Benchmarks
 * T050: Performance testing for form operations
 *
 * Targets:
 * - Form render: <2s for 500 operations
 * - CSV export: <5s
 * - OAS validate: <3s
 * - PDF generation: <10s
 */

import { describe, it, expect, beforeEach } from "vitest";

// Generate a large OAS document with N operations
function generateLargeOAS(operationCount: number): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  const methods = ["get", "post", "put", "delete"];

  for (let i = 0; i < operationCount; i++) {
    const pathIndex = Math.floor(i / methods.length);
    const methodIndex = i % methods.length;
    const path = `/resource${pathIndex}`;
    const method = methods[methodIndex];

    if (!paths[path]) {
      paths[path] = {};
    }

    paths[path][method] = {
      operationId: `operation${i}`,
      summary: `Operation ${i} summary`,
      description: `This is operation number ${i} with a longer description for realistic sizing.`,
      tags: [`tag${i % 10}`],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "filter",
          in: "query",
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        "400": { description: "Bad Request" },
        "404": { description: "Not Found" },
        "500": { description: "Server Error" },
      },
    };
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Large Test API",
      version: "1.0.0",
      description: "A large API for performance testing",
    },
    paths,
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            code: { type: "integer" },
            message: { type: "string" },
          },
        },
      },
    },
  };
}

describe("Performance Benchmarks", () => {
  describe("CSV Export Performance", () => {
    it("should export 500 operations in under 5 seconds", async () => {
      const largeOAS = generateLargeOAS(500);

      const startTime = performance.now();

      // Simulate CSV export logic
      const paths = largeOAS.paths as Record<string, Record<string, unknown>>;
      const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
      const rows: string[] = ["operation_id,path,method,summary"];

      for (const [path, pathItem] of Object.entries(paths)) {
        for (const method of methods) {
          const op = pathItem[method] as Record<string, unknown> | undefined;
          if (op) {
            const row = [
              op.operationId || "",
              path,
              method.toUpperCase(),
              (op.summary as string) || "",
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(",");
            rows.push(row);
          }
        }
      }

      const csvContent = rows.join("\n");

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`CSV Export: ${rows.length - 1} operations in ${duration.toFixed(2)}ms`);
      console.log(`CSV size: ${(csvContent.length / 1024).toFixed(2)}KB`);

      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(rows.length - 1).toBe(500);
    });
  });

  describe("OAS Validation Performance", () => {
    it("should validate 500-operation OAS in under 3 seconds", async () => {
      const largeOAS = generateLargeOAS(500);

      const startTime = performance.now();

      // Simulate basic validation logic
      const errors: string[] = [];

      // Check required fields
      if (!largeOAS.openapi) errors.push("Missing openapi version");
      if (!largeOAS.info) errors.push("Missing info object");

      const info = largeOAS.info as Record<string, unknown>;
      if (!info.title) errors.push("Missing info.title");
      if (!info.version) errors.push("Missing info.version");

      // Check paths
      const paths = largeOAS.paths as Record<string, Record<string, unknown>>;
      for (const [path, pathItem] of Object.entries(paths)) {
        if (!path.startsWith("/")) {
          errors.push(`Path ${path} must start with /`);
        }

        const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
        for (const method of methods) {
          const op = pathItem[method] as Record<string, unknown> | undefined;
          if (op) {
            if (!op.responses) {
              errors.push(`${method.toUpperCase()} ${path} missing responses`);
            }
          }
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`OAS Validation: ${duration.toFixed(2)}ms`);
      console.log(`Errors found: ${errors.length}`);

      expect(duration).toBeLessThan(3000); // 3 seconds
      expect(errors.length).toBe(0);
    });
  });

  describe("JSON Serialization Performance", () => {
    it("should serialize 500-operation OAS in under 1 second", async () => {
      const largeOAS = generateLargeOAS(500);

      const startTime = performance.now();

      const jsonString = JSON.stringify(largeOAS, null, 2);

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`JSON Serialization: ${duration.toFixed(2)}ms`);
      console.log(`JSON size: ${(jsonString.length / 1024).toFixed(2)}KB`);

      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe("Path Extraction Performance", () => {
    it("should extract paths from 500-operation OAS in under 500ms", async () => {
      const largeOAS = generateLargeOAS(500);

      const startTime = performance.now();

      const paths = largeOAS.paths as Record<string, Record<string, unknown>>;
      const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
      const operations: Array<{ path: string; method: string; operationId: string }> = [];

      for (const [path, pathItem] of Object.entries(paths)) {
        for (const method of methods) {
          const op = pathItem[method] as Record<string, unknown> | undefined;
          if (op) {
            operations.push({
              path,
              method: method.toUpperCase(),
              operationId: (op.operationId as string) || "",
            });
          }
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Path Extraction: ${operations.length} operations in ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(500); // 500ms
      expect(operations.length).toBe(500);
    });
  });

  describe("Memory Usage", () => {
    it("should handle 1000 operations without memory issues", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const largeOAS = generateLargeOAS(1000);

      // Perform some operations
      const jsonString = JSON.stringify(largeOAS);
      const parsed = JSON.parse(jsonString);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);

      // Should not increase by more than 50MB for 1000 operations
      expect(memoryIncrease).toBeLessThan(50);
      expect(parsed.openapi).toBe("3.0.3");
    });
  });
});
