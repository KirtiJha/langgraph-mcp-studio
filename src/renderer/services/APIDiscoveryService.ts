import { PublicAPISpec, PublicAPIEndpoint } from "../../shared/publicApiTypes";
import {
  APIServerConfig,
  APIEndpoint,
  APIAuthentication,
} from "../../shared/apiServerTypes";
import PrivateAPIService from "./PrivateAPIService";

interface APIDiscoveryResult {
  success: boolean;
  api?: PublicAPISpec;
  endpoints?: PublicAPIEndpoint[];
  error?: string;
  confidence: number; // 0-100 confidence score
  suggestions?: string[];
}

interface AutoConfigOptions {
  includeAuth?: boolean;
  includeHeaders?: boolean;
  generateDocs?: boolean;
  validateEndpoints?: boolean;
  inferTypes?: boolean;
}

class APIDiscoveryService {
  private static instance: APIDiscoveryService;

  public static getInstance(): APIDiscoveryService {
    if (!APIDiscoveryService.instance) {
      APIDiscoveryService.instance = new APIDiscoveryService();
    }
    return APIDiscoveryService.instance;
  }

  private constructor() {}

  /**
   * Automatically discover API from a base URL
   */
  async discoverAPI(
    baseUrl: string,
    options: AutoConfigOptions = {}
  ): Promise<APIDiscoveryResult> {
    try {
      const normalizedUrl = this.normalizeUrl(baseUrl);
      let confidence = 0;
      const suggestions: string[] = [];

      // Try multiple discovery methods
      const methods = [
        () => this.tryOpenAPIDiscovery(normalizedUrl),
        () => this.trySwaggerDiscovery(normalizedUrl),
        () => this.tryWellKnownEndpoints(normalizedUrl),
        () => this.trySchemaDiscovery(normalizedUrl),
        () => this.tryHeuristicDiscovery(normalizedUrl),
      ];

      for (const method of methods) {
        try {
          const result = await method();
          if (result.success && result.confidence > confidence) {
            confidence = result.confidence;
            if (result.api) {
              // Enhance discovered API with additional information
              const enhancedAPI = await this.enhanceDiscoveredAPI(
                result.api,
                normalizedUrl,
                options
              );

              return {
                success: true,
                api: enhancedAPI,
                endpoints: result.endpoints,
                confidence,
                suggestions: [...suggestions, ...(result.suggestions || [])],
              };
            }
          }
          suggestions.push(...(result.suggestions || []));
        } catch (error) {
          console.warn(`Discovery method failed:`, error);
        }
      }

      // If no discovery method worked, create a basic API structure
      const fallbackAPI = await this.createFallbackAPI(normalizedUrl, options);

      return {
        success: true,
        api: fallbackAPI,
        endpoints: fallbackAPI.endpoints || [],
        confidence: 30,
        suggestions: [
          "No OpenAPI specification found",
          "Consider adding endpoints manually",
          "Check if the API has documentation at /docs or /api-docs",
          ...suggestions,
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Discovery failed",
        confidence: 0,
        suggestions: [
          "Check if the URL is accessible",
          "Verify network connectivity",
          "Try with authentication if required",
        ],
      };
    }
  }

  /**
   * Try to discover OpenAPI 3.0 specification
   */
  private async tryOpenAPIDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const possiblePaths = [
      "/openapi.json",
      "/openapi.yaml",
      "/v1/openapi.json",
      "/api/openapi.json",
      "/docs/openapi.json",
    ];

    for (const path of possiblePaths) {
      try {
        const spec = await this.fetchSpec(`${baseUrl}${path}`);
        if (spec && (spec.openapi || spec.swagger)) {
          const api = this.parseOpenAPISpec(spec, baseUrl);
          return {
            success: true,
            api,
            endpoints: api.endpoints,
            confidence: 95,
            suggestions: [
              "OpenAPI specification found and parsed successfully",
            ],
          };
        }
      } catch (error) {
        // Continue trying other paths
      }
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Try to discover Swagger 2.0 specification
   */
  private async trySwaggerDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const possiblePaths = [
      "/swagger.json",
      "/swagger.yaml",
      "/v1/swagger.json",
      "/api/swagger.json",
      "/docs/swagger.json",
      "/swagger/v1/swagger.json",
    ];

    for (const path of possiblePaths) {
      try {
        const spec = await this.fetchSpec(`${baseUrl}${path}`);
        if (spec && spec.swagger) {
          const api = this.parseSwaggerSpec(spec, baseUrl);
          return {
            success: true,
            api,
            endpoints: api.endpoints,
            confidence: 90,
            suggestions: ["Swagger 2.0 specification found and converted"],
          };
        }
      } catch (error) {
        // Continue trying other paths
      }
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Try common well-known endpoints
   */
  private async tryWellKnownEndpoints(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const wellKnownEndpoints = [
      "/.well-known/api",
      "/.well-known/openapi",
      "/health",
      "/status",
      "/ping",
      "/info",
      "/version",
    ];

    const discoveredEndpoints: PublicAPIEndpoint[] = [];
    let workingEndpoints = 0;

    for (const endpoint of wellKnownEndpoints) {
      try {
        const response = await this.testEndpoint(`${baseUrl}${endpoint}`);
        if (response.ok) {
          workingEndpoints++;
          discoveredEndpoints.push({
            id: `well-known-${endpoint.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path: endpoint,
            method: "GET",
            summary: `Well-known endpoint: ${endpoint}`,
            description: `Discovered well-known endpoint`,
            responses: {
              "200": { description: "Success" },
            },
          });
        }
      } catch (error) {
        // Endpoint not available
      }
    }

    if (workingEndpoints > 0) {
      const api = this.createAPIFromEndpoints(baseUrl, discoveredEndpoints);
      return {
        success: true,
        api,
        endpoints: discoveredEndpoints,
        confidence: 50 + workingEndpoints * 5,
        suggestions: [
          `Found ${workingEndpoints} well-known endpoints`,
          "Consider looking for more endpoints in API documentation",
        ],
      };
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Try GraphQL schema introspection
   */
  private async trySchemaDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const graphqlPaths = ["/graphql", "/api/graphql", "/v1/graphql"];

    for (const path of graphqlPaths) {
      try {
        const introspectionQuery = {
          query: `
            query IntrospectionQuery {
              __schema {
                queryType { name }
                mutationType { name }
                subscriptionType { name }
                types {
                  name
                  kind
                  description
                }
              }
            }
          `,
        };

        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(introspectionQuery),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.__schema) {
            const api = this.createGraphQLAPI(
              baseUrl,
              path,
              result.data.__schema
            );
            return {
              success: true,
              api,
              endpoints: api.endpoints,
              confidence: 85,
              suggestions: ["GraphQL schema discovered via introspection"],
            };
          }
        }
      } catch (error) {
        // Continue trying other paths
      }
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Use heuristic discovery based on common patterns
   */
  private async tryHeuristicDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const commonEndpoints = [
      "/api",
      "/api/v1",
      "/api/v2",
      "/v1",
      "/v2",
      "/rest",
      "/users",
      "/items",
      "/data",
    ];

    const discoveredEndpoints: PublicAPIEndpoint[] = [];
    let workingEndpoints = 0;

    for (const endpoint of commonEndpoints) {
      try {
        const response = await this.testEndpoint(`${baseUrl}${endpoint}`);
        if (response.ok) {
          workingEndpoints++;
          discoveredEndpoints.push({
            id: `heuristic-${endpoint.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path: endpoint,
            method: "GET",
            summary: `Discovered endpoint: ${endpoint}`,
            description: `Heuristically discovered endpoint`,
            responses: {
              "200": { description: "Success" },
            },
          });
        }
      } catch (error) {
        // Endpoint not available
      }
    }

    if (workingEndpoints > 0) {
      const api = this.createAPIFromEndpoints(baseUrl, discoveredEndpoints);
      return {
        success: true,
        api,
        endpoints: discoveredEndpoints,
        confidence: 40 + workingEndpoints * 3,
        suggestions: [
          `Found ${workingEndpoints} potential API endpoints`,
          "These endpoints were discovered heuristically",
          "Verify functionality and add proper parameters",
        ],
      };
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Auto-configure API server from discovered API
   */
  async autoConfigureAPIServer(
    discoveredAPI: PublicAPISpec,
    options: AutoConfigOptions = {}
  ): Promise<APIServerConfig> {
    const config: APIServerConfig = {
      id: `auto-${Date.now()}`,
      name: `${discoveredAPI.name} Auto-Configured`,
      description: `Auto-configured server for ${discoveredAPI.name}. ${discoveredAPI.description}`,
      baseUrl: discoveredAPI.baseUrl,
      authentication: this.inferAuthentication(discoveredAPI),
      endpoints: await this.convertEndpoints(discoveredAPI.endpoints || []),
      globalHeaders: this.generateGlobalHeaders(discoveredAPI),
      timeout: 30000,
      retries: 3,
      created: new Date(),
      updated: new Date(),

      // Enhanced configuration based on options
      monitoring: options.validateEndpoints
        ? {
            enabled: true,
            healthCheck: {
              enabled: true,
              endpoint: "/health",
              interval: 300000,
            },
            metrics: {
              enabled: true,
              exportFormat: "json",
            },
          }
        : { enabled: false },

      logging: {
        level: "info",
        requests: true,
        responses: false,
        errors: true,
        format: "structured",
      },

      security: {
        rateLimit: true,
        cors: true,
        validation: options.inferTypes || false,
        sanitization: true,
      },

      caching: {
        enabled: true,
        defaultTtl: 300,
        strategy: "lru",
      },
    };

    return config;
  }

  // Helper methods

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return url.startsWith("http") ? url : `https://${url}`;
    }
  }

  private async fetchSpec(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: { Accept: "application/json, application/yaml" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("yaml")) {
      const yaml = await response.text();
      // In a real implementation, you'd use a YAML parser here
      throw new Error("YAML parsing not implemented");
    }

    return response.json();
  }

  private async testEndpoint(
    url: string
  ): Promise<{ ok: boolean; status: number }> {
    try {
      const response = await fetch(url, { method: "GET" });
      return { ok: response.ok, status: response.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }

  private parseOpenAPISpec(spec: any, baseUrl: string): PublicAPISpec {
    const info = spec.info || {};

    return {
      id: `discovered-${Date.now()}`,
      name: info.title || "Discovered API",
      description: info.description || "Auto-discovered API",
      version: info.version || "1.0.0",
      category: "Discovered",
      baseUrl: spec.servers?.[0]?.url || baseUrl,
      provider: "Auto-Discovery",
      tags: ["discovered", "openapi"],
      endpoints: this.extractEndpointsFromOpenAPI(spec),
      authentication: this.inferAuthFromSpec(spec),
      status: "active" as const,
      lastUpdated: new Date().toISOString(),
      pricing: "unknown" as any,
    };
  }

  private parseSwaggerSpec(spec: any, baseUrl: string): PublicAPISpec {
    // Convert Swagger 2.0 to OpenAPI 3.0 format
    const convertedSpec = this.convertSwaggerToOpenAPI(spec);
    return this.parseOpenAPISpec(convertedSpec, baseUrl);
  }

  private createAPIFromEndpoints(
    baseUrl: string,
    endpoints: PublicAPIEndpoint[]
  ): PublicAPISpec {
    return {
      id: `discovered-${Date.now()}`,
      name: "Discovered API",
      description: "API discovered through endpoint scanning",
      version: "1.0.0",
      category: "Discovered",
      baseUrl,
      provider: "Auto-Discovery",
      tags: ["discovered", "scanned"],
      endpoints,
      status: "active",
      lastUpdated: new Date().toISOString(),
      pricing: "unknown" as any,
    };
  }

  private createGraphQLAPI(
    baseUrl: string,
    path: string,
    schema: any
  ): PublicAPISpec {
    const endpoints: PublicAPIEndpoint[] = [
      {
        id: "graphql-endpoint",
        path,
        method: "POST",
        summary: "GraphQL Endpoint",
        description: "GraphQL API endpoint with schema introspection",
        responses: { "200": { description: "GraphQL response" } },
      },
    ];

    return {
      id: `graphql-${Date.now()}`,
      name: "GraphQL API",
      description: "Auto-discovered GraphQL API",
      version: "1.0.0",
      category: "GraphQL",
      baseUrl,
      provider: "Auto-Discovery",
      tags: ["discovered", "graphql"],
      endpoints,
      status: "active",
      lastUpdated: new Date().toISOString(),
      pricing: "unknown" as any,
    };
  }

  private async enhanceDiscoveredAPI(
    api: PublicAPISpec,
    baseUrl: string,
    options: AutoConfigOptions
  ): Promise<PublicAPISpec> {
    // Add authentication detection only if not already detected from spec
    if (
      options.includeAuth &&
      (!api.authentication || api.authentication.type === "none")
    ) {
      api.authentication = await this.detectAuthentication(baseUrl);
    }

    // Add custom headers detection
    if (options.includeHeaders) {
      // Detect common headers by testing endpoints
    }

    return api;
  }

  private async createFallbackAPI(
    baseUrl: string,
    options: AutoConfigOptions
  ): Promise<PublicAPISpec> {
    return {
      id: `fallback-${Date.now()}`,
      name: "Unknown API",
      description: "API discovered without specification",
      version: "1.0.0",
      category: "Unknown",
      baseUrl,
      provider: "Manual Discovery",
      tags: ["manual", "unknown"],
      endpoints: [],
      status: "active",
      lastUpdated: new Date().toISOString(),
      pricing: "unknown" as any,
    };
  }

  private extractEndpointsFromOpenAPI(spec: any): PublicAPIEndpoint[] {
    const endpoints: PublicAPIEndpoint[] = [];

    if (!spec.paths) {
      return endpoints;
    }

    // Iterate through all paths in the OpenAPI spec
    Object.entries(spec.paths).forEach(([path, pathObj]: [string, any]) => {
      if (!pathObj || typeof pathObj !== "object") {
        return;
      }

      // For each HTTP method in the path
      Object.entries(pathObj).forEach(([method, operation]: [string, any]) => {
        const httpMethod = method.toUpperCase() as
          | "GET"
          | "POST"
          | "PUT"
          | "DELETE"
          | "PATCH";

        // Skip if not a valid HTTP method
        if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(httpMethod)) {
          return;
        }

        const endpointId = `${method.toLowerCase()}-${path.replace(
          /[^a-zA-Z0-9]/g,
          "-"
        )}`;

        // Extract parameters
        const parameters: {
          name: string;
          in: "query" | "header" | "path" | "cookie" | "formData";
          required: boolean;
          type: string;
          description?: string;
          example?: any;
        }[] = [];

        // Path parameters
        if (operation.parameters) {
          operation.parameters.forEach((param: any) => {
            if (
              param.in === "path" ||
              param.in === "query" ||
              param.in === "header"
            ) {
              parameters.push({
                name: param.name,
                in: param.in as
                  | "query"
                  | "header"
                  | "path"
                  | "cookie"
                  | "formData",
                required: param.required || false,
                type: param.schema?.type || "string",
                description: param.description || "",
                example: param.example,
              });
            }
          });
        }

        // Request body (for POST, PUT, PATCH)
        let requestBody: any = undefined;
        if (operation.requestBody && operation.requestBody.content) {
          const content = operation.requestBody.content;
          const contentType = Object.keys(content)[0]; // Get first content type
          const schema = content[contentType]?.schema;

          requestBody = {
            required: operation.requestBody.required || false,
            contentType,
            schema,
          };

          // Extract request body properties as parameters for POST/PUT/PATCH
          if (
            schema &&
            schema.properties &&
            ["POST", "PUT", "PATCH"].includes(method.toUpperCase())
          ) {
            Object.entries(schema.properties).forEach(
              ([propName, propSchema]: [string, any]) => {
                const isRequired = schema.required?.includes(propName) || false;
                parameters.push({
                  name: propName,
                  in: "formData" as
                    | "query"
                    | "header"
                    | "path"
                    | "cookie"
                    | "formData",
                  required: isRequired,
                  type: propSchema.type || "string",
                  description: propSchema.description || `${propName} field`,
                  example: propSchema.example || propSchema.default,
                });
              }
            );
          }
        }

        // Responses
        const responses: Record<string, any> = {};
        if (operation.responses) {
          Object.entries(operation.responses).forEach(
            ([statusCode, response]: [string, any]) => {
              responses[statusCode] = {
                description: response.description || `Response ${statusCode}`,
                schema: response.content?.["application/json"]?.schema,
              };
            }
          );
        }

        endpoints.push({
          id: endpointId,
          path,
          method: httpMethod,
          summary: operation.summary || `${method.toUpperCase()} ${path}`,
          description:
            operation.description ||
            operation.summary ||
            `${method.toUpperCase()} operation for ${path}`,
          parameters,
          requestBody,
          responses,
          tags: operation.tags || [],
          deprecated: operation.deprecated || false,
        });
      });
    });

    return endpoints;
  }

  private inferAuthFromSpec(spec: any): any {
    // Analyze security schemes in OpenAPI spec
    if (spec.components?.securitySchemes) {
      const schemes = spec.components.securitySchemes;
      const firstScheme = Object.values(schemes)[0] as any;

      if (firstScheme) {
        switch (firstScheme.type) {
          case "apiKey":
            return {
              type: "apiKey",
              keyName: firstScheme.name,
              keyLocation: firstScheme.in,
            };
          case "oauth2":
            return {
              type: "oauth2",
              flow: Object.keys(firstScheme.flows || {})[0],
              scopes: Object.keys(
                firstScheme.flows?.[Object.keys(firstScheme.flows)[0]]
                  ?.scopes || {}
              ),
            };
          case "http":
            return {
              type: firstScheme.scheme === "bearer" ? "bearer" : "basic",
            };
          default:
            return { type: "none" };
        }
      }
    }

    // Check for global security requirements
    if (spec.security && spec.security.length > 0) {
      return { type: "apiKey" }; // Default assumption
    }

    return { type: "none" };
  }

  private convertSwaggerToOpenAPI(swagger: any): any {
    // Basic conversion from Swagger 2.0 to OpenAPI 3.0
    const openapi = {
      openapi: "3.0.0",
      info: swagger.info || {},
      servers: swagger.host
        ? [
            {
              url: `${swagger.schemes?.[0] || "http"}://${swagger.host}${
                swagger.basePath || ""
              }`,
            },
          ]
        : [],
      paths: swagger.paths || {},
      components: {
        schemas: swagger.definitions || {},
        securitySchemes: this.convertSwaggerSecurity(
          swagger.securityDefinitions || {}
        ),
      },
    };

    // Convert path parameters and responses
    Object.keys(openapi.paths).forEach((path) => {
      Object.keys(openapi.paths[path]).forEach((method) => {
        const operation = openapi.paths[path][method];
        if (operation.parameters) {
          operation.parameters = operation.parameters.map((param: any) => {
            if (param.in === "body") {
              // Convert body parameter to requestBody
              delete operation.parameters;
              return {
                requestBody: {
                  required: param.required,
                  content: {
                    "application/json": {
                      schema: param.schema,
                    },
                  },
                },
              };
            }
            return param;
          });
        }
      });
    });

    return openapi;
  }

  private convertSwaggerSecurity(securityDefs: any): any {
    const schemes: any = {};
    Object.keys(securityDefs).forEach((key) => {
      const def = securityDefs[key];
      if (def.type === "apiKey") {
        schemes[key] = {
          type: "apiKey",
          name: def.name,
          in: def.in,
        };
      } else if (def.type === "oauth2") {
        schemes[key] = {
          type: "oauth2",
          flows: {
            [def.flow]: {
              authorizationUrl: def.authorizationUrl,
              tokenUrl: def.tokenUrl,
              scopes: def.scopes || {},
            },
          },
        };
      }
    });
    return schemes;
  }

  private inferAuthentication(api: PublicAPISpec): APIAuthentication {
    if (!api.authentication || api.authentication.type === "none") {
      return { type: "none", credentials: {} };
    }

    // Convert PublicAPISpec authentication to APIServerConfig authentication
    const auth = api.authentication;
    const result: APIAuthentication = {
      type: "none",
      credentials: {},
    };

    switch (auth.type) {
      case "apiKey":
        result.type = "apikey";
        result.headerName = auth.keyName || "X-API-Key";
        result.credentials = auth.testCredentials || {};
        break;
      case "bearer":
        result.type = "bearer";
        result.credentials = auth.testCredentials || {};
        break;
      case "basic":
        result.type = "basic";
        result.credentials = auth.testCredentials || {};
        break;
      case "oauth2":
        result.type = "oauth2";
        result.oauth2 = {
          scopes: auth.scopes || [],
          flow: (auth.flow as any) || "authorization_code",
        };
        result.credentials = auth.testCredentials || {};
        break;
      default:
        result.type = "none";
        result.credentials = {};
    }

    return result;
  }

  private async convertEndpoints(
    endpoints: PublicAPIEndpoint[]
  ): Promise<APIEndpoint[]> {
    // Convert PublicAPIEndpoint[] to APIEndpoint[]
    return endpoints.map((endpoint) => ({
      id: endpoint.id,
      path: endpoint.path,
      method: endpoint.method as any, // Cast to include additional methods from APIEndpoint
      toolName: this.generateToolName(endpoint.path, endpoint.method),
      description: endpoint.description || endpoint.summary || "",
      parameters:
        endpoint.parameters?.map((param) => ({
          name: param.name,
          type: this.mapParameterType(param.type),
          required: param.required,
          description: param.description,
        })) || [],
      body: endpoint.requestBody
        ? {
            type: this.getBodyType(endpoint.requestBody.contentType),
            schema: endpoint.requestBody.schema,
            required: endpoint.requestBody.required,
          }
        : undefined,
      enabled: true,
    }));
  }

  private generateToolName(path: string, method: string): string {
    // Generate a clean tool name from path and method
    const cleanPath = path
      .replace(/[{}]/g, "") // Remove path parameter braces
      .replace(/[^a-zA-Z0-9]/g, "_") // Replace special chars with underscore
      .replace(/_+/g, "_") // Replace multiple underscores with single
      .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

    return `${method.toLowerCase()}_${cleanPath}`;
  }

  private mapParameterType(
    type: string
  ): "string" | "number" | "boolean" | "array" | "object" {
    switch (type) {
      case "integer":
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        return "array";
      case "object":
        return "object";
      default:
        return "string";
    }
  }

  private getBodyType(
    contentType: string
  ): "json" | "form" | "text" | "multipart" | "graphql" | "binary" {
    if (contentType.includes("application/json")) return "json";
    if (contentType.includes("application/x-www-form-urlencoded"))
      return "form";
    if (contentType.includes("multipart/form-data")) return "multipart";
    if (contentType.includes("text/")) return "text";
    if (contentType.includes("application/graphql")) return "graphql";
    return "binary";
  }

  private generateGlobalHeaders(api: PublicAPISpec): Record<string, string> {
    return {
      "User-Agent": "MCP-Studio-Auto-Discovery/1.0.0",
      Accept: "application/json",
    };
  }

  private async detectAuthentication(baseUrl: string): Promise<any> {
    // Test various authentication methods
    return { type: "none" };
  }
}

export default APIDiscoveryService.getInstance();
export type { APIDiscoveryResult, AutoConfigOptions };
