import { PublicAPISpec, PublicAPIEndpoint } from "../../shared/publicApiTypes";
import {
  APIServerConfig,
  APIEndpoint,
  APIParameter,
  APIAuthentication,
} from "../../shared/apiServerTypes";
import { v4 as uuidv4 } from "uuid";

class PublicAPIToMCPService {
  private static instance: PublicAPIToMCPService;

  public static getInstance(): PublicAPIToMCPService {
    if (!PublicAPIToMCPService.instance) {
      PublicAPIToMCPService.instance = new PublicAPIToMCPService();
    }
    return PublicAPIToMCPService.instance;
  }

  private constructor() {}

  /**
   * Convert a Public API specification to an MCP-compatible API server configuration
   */
  async convertToMCP(publicAPI: PublicAPISpec): Promise<APIServerConfig> {
    try {
      // First, fetch the OpenAPI specification to get real endpoints and base URL
      const enrichedAPI = await this.enrichAPIWithOpenAPISpec(publicAPI);

      const mcpConfig: APIServerConfig = {
        id: uuidv4(),
        name: `${enrichedAPI.name} MCP Server`,
        description: `Auto-generated MCP server for ${enrichedAPI.name} API. ${
          enrichedAPI.description || ""
        }`,
        baseUrl: this.normalizeBaseUrl(enrichedAPI.baseUrl),
        authentication: this.convertAuthentication(enrichedAPI),
        endpoints: this.convertEndpoints(enrichedAPI),
        globalHeaders: this.generateGlobalHeaders(enrichedAPI),
        rateLimit: this.convertRateLimit(enrichedAPI),
        timeout: 30000, // 30 second default timeout
        retries: 3,
        environment: this.generateEnvironmentVariables(enrichedAPI),
        proxy: {
          enabled: false,
        },
        cors: {
          enabled: true,
          origins: ["*"],
          methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          headers: ["Content-Type", "Authorization", "X-API-Key"],
        },
        logging: {
          level: "info",
          requests: true,
          responses: true,
          errors: true,
        },
        monitoring: {
          enabled: true,
          healthCheck: {
            enabled: true,
            endpoint: "/health",
            interval: 300000, // 5 minutes
          },
          metrics: {
            enabled: true,
            endpoint: "/metrics",
          },
        },
        security: {
          rateLimit: true,
          cors: true,
          validation: true,
        },
        apiVersion: publicAPI.version,
        openApiSpec: publicAPI.openApiSpec,
        tags: publicAPI.tags,
        category: publicAPI.category,
        provider: publicAPI.provider,
        documentation: publicAPI.documentation,
        license: publicAPI.license,
        contact: publicAPI.contact,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        created: new Date(),
        updated: new Date(),
      };

      return mcpConfig;
    } catch (error) {
      console.error("Failed to convert public API to MCP:", error);
      throw new Error(
        `Conversion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private normalizeBaseUrl(baseUrl: string): string {
    if (!baseUrl) return "";

    // Remove trailing slash
    let normalized = baseUrl.replace(/\/$/, "");

    // Ensure it starts with http/https
    if (
      !normalized.startsWith("http://") &&
      !normalized.startsWith("https://")
    ) {
      normalized = `https://${normalized}`;
    }

    return normalized;
  }

  private convertAuthentication(publicAPI: PublicAPISpec): APIAuthentication {
    const auth = publicAPI.authentication;

    if (!auth || auth.type === "none") {
      return {
        type: "none",
        credentials: {},
      };
    }

    switch (auth.type) {
      case "apiKey":
        return {
          type: "apikey",
          credentials: {},
          headerName: auth.keyName || "X-API-Key",
          queryParam:
            auth.keyLocation === "query"
              ? auth.keyName || "api_key"
              : undefined,
        };

      case "bearer":
        return {
          type: "bearer",
          credentials: {},
        };

      case "oauth2":
        return {
          type: "oauth2",
          credentials: {},
          oauth2: {
            scopes: auth.scopes || [],
            clientId: "",
            clientSecret: "",
          },
        };

      case "basic":
        return {
          type: "basic",
          credentials: {},
        };

      default:
        return {
          type: "custom",
          credentials: {},
          custom: {
            headers: {},
            beforeRequest: "// Custom authentication logic",
          },
        };
    }
  }

  private convertEndpoints(publicAPI: PublicAPISpec): APIEndpoint[] {
    if (!publicAPI.endpoints || publicAPI.endpoints.length === 0) {
      // Generate basic endpoints if none are provided
      return this.generateBasicEndpoints(publicAPI);
    }

    return publicAPI.endpoints.map((endpoint, index) =>
      this.convertEndpoint(endpoint, index, publicAPI)
    );
  }

  private convertEndpoint(
    publicEndpoint: PublicAPIEndpoint,
    index: number,
    publicAPI: PublicAPISpec
  ): APIEndpoint {
    const toolName = this.generateToolName(publicEndpoint, publicAPI);

    return {
      id: publicEndpoint.id || `endpoint-${index}`,
      path: this.normalizePath(publicEndpoint.path),
      method: publicEndpoint.method,
      toolName,
      description:
        publicEndpoint.description ||
        publicEndpoint.summary ||
        `${publicEndpoint.method} ${publicEndpoint.path}`,
      parameters: this.convertParameters(publicEndpoint),
      headers: {},
      body: this.convertRequestBody(publicEndpoint),
      responseMapping: this.generateResponseMapping(publicEndpoint),
      validation: this.generateValidation(publicEndpoint),
      caching: {
        enabled: publicEndpoint.method === "GET",
        ttl: publicEndpoint.method === "GET" ? 300 : undefined, // 5 minutes for GET requests
        key:
          publicEndpoint.method === "GET" ? `${toolName}:{{url}}` : undefined,
      },
      rateLimit: this.generateEndpointRateLimit(publicAPI),
      timeout: 30000,
      retries: {
        count: 3,
        delay: 1000,
        backoff: "exponential",
      },
      enabled: true,
    };
  }

  private generateBasicEndpoints(publicAPI: PublicAPISpec): APIEndpoint[] {
    // Generate some common endpoints based on the API type
    const endpoints: APIEndpoint[] = [];
    const category = publicAPI.category.toLowerCase();

    if (category.includes("weather")) {
      endpoints.push(this.createWeatherEndpoints(publicAPI));
    } else if (category.includes("finance")) {
      endpoints.push(...this.createFinanceEndpoints(publicAPI));
    } else if (category.includes("social")) {
      endpoints.push(...this.createSocialEndpoints(publicAPI));
    } else {
      // Generic endpoints
      endpoints.push(
        this.createGenericEndpoint(publicAPI, "GET", "/api/data", "Get data")
      );
    }

    return endpoints.flat();
  }

  private createWeatherEndpoints(publicAPI: PublicAPISpec): APIEndpoint {
    return {
      id: "get-weather",
      path: "/current",
      method: "GET",
      toolName: "getCurrentWeather",
      description: "Get current weather conditions",
      parameters: [
        {
          name: "location",
          type: "string",
          required: true,
          description: "Location (city, coordinates, etc.)",
          example: "New York",
        },
        {
          name: "units",
          type: "string",
          required: false,
          description: "Temperature units",
          enum: ["metric", "imperial", "kelvin"],
          defaultValue: "metric",
        },
      ],
      headers: {},
      responseMapping: {
        successPath: "data",
        statusCodes: [200],
      },
      caching: {
        enabled: true,
        ttl: 600, // 10 minutes
        key: "weather:{{location}}:{{units}}",
      },
      enabled: true,
    };
  }

  private createFinanceEndpoints(publicAPI: PublicAPISpec): APIEndpoint[] {
    return [
      {
        id: "get-stock-price",
        path: "/quote",
        method: "GET",
        toolName: "getStockPrice",
        description: "Get stock price and quote information",
        parameters: [
          {
            name: "symbol",
            type: "string",
            required: true,
            description: "Stock symbol (e.g., AAPL, GOOGL)",
            example: "AAPL",
          },
        ],
        headers: {},
        caching: {
          enabled: true,
          ttl: 60, // 1 minute
          key: "stock:{{symbol}}",
        },
        enabled: true,
      },
      {
        id: "get-exchange-rates",
        path: "/rates",
        method: "GET",
        toolName: "getExchangeRates",
        description: "Get currency exchange rates",
        parameters: [
          {
            name: "base",
            type: "string",
            required: false,
            description: "Base currency",
            defaultValue: "USD",
            example: "USD",
          },
          {
            name: "symbols",
            type: "string",
            required: false,
            description: "Comma-separated list of currency symbols",
            example: "EUR,GBP,JPY",
          },
        ],
        headers: {},
        caching: {
          enabled: true,
          ttl: 3600, // 1 hour
          key: "rates:{{base}}:{{symbols}}",
        },
        enabled: true,
      },
    ];
  }

  private createSocialEndpoints(publicAPI: PublicAPISpec): APIEndpoint[] {
    return [
      {
        id: "get-posts",
        path: "/posts",
        method: "GET",
        toolName: "getPosts",
        description: "Get social media posts",
        parameters: [
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Number of posts to retrieve",
            defaultValue: 10,
            validation: { min: 1, max: 100 },
          },
          {
            name: "offset",
            type: "number",
            required: false,
            description: "Pagination offset",
            defaultValue: 0,
            validation: { min: 0 },
          },
        ],
        headers: {},
        caching: {
          enabled: true,
          ttl: 300, // 5 minutes
          key: "posts:{{limit}}:{{offset}}",
        },
        enabled: true,
      },
    ];
  }

  private createGenericEndpoint(
    publicAPI: PublicAPISpec,
    method: string,
    path: string,
    description: string
  ): APIEndpoint {
    return {
      id: `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
      path,
      method: method as any,
      toolName: this.generateToolName(
        { method: method as any, path, summary: description } as any,
        publicAPI
      ),
      description,
      parameters: [],
      headers: {},
      caching: {
        enabled: method === "GET",
        ttl: method === "GET" ? 300 : undefined,
      },
      enabled: true,
    };
  }

  private convertParameters(endpoint: PublicAPIEndpoint): APIParameter[] {
    if (!endpoint.parameters) return [];

    return endpoint.parameters.map((param) => ({
      name: param.name,
      type: this.mapParameterType(param.type),
      required: param.required,
      description: param.description || "",
      example: param.example,
      validation: this.generateParameterValidation(param),
    }));
  }

  private mapParameterType(type: string): APIParameter["type"] {
    switch (type.toLowerCase()) {
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

  private generateParameterValidation(param: any): APIParameter["validation"] {
    const validation: APIParameter["validation"] = {};

    if (param.minimum !== undefined) validation.min = param.minimum;
    if (param.maximum !== undefined) validation.max = param.maximum;
    if (param.pattern) validation.pattern = param.pattern;
    if (param.format) {
      switch (param.format) {
        case "email":
          validation.format = "email";
          break;
        case "uri":
        case "url":
          validation.format = "uri";
          break;
        case "date":
          validation.format = "date";
          break;
        case "date-time":
          validation.format = "date-time";
          break;
        case "uuid":
          validation.format = "uuid";
          break;
      }
    }

    return Object.keys(validation).length > 0 ? validation : undefined;
  }

  private convertRequestBody(endpoint: PublicAPIEndpoint): APIEndpoint["body"] {
    if (!endpoint.requestBody) return undefined;

    return {
      type: this.mapContentType(endpoint.requestBody.contentType),
      schema: endpoint.requestBody.schema,
      required: endpoint.requestBody.required,
    };
  }

  private mapContentType(
    contentType: string
  ): "json" | "form" | "text" | "multipart" {
    if (!contentType) return "json";

    if (contentType.includes("json")) return "json";
    if (contentType.includes("form-data")) return "multipart";
    if (contentType.includes("form-urlencoded")) return "form";
    if (contentType.includes("text")) return "text";

    return "json";
  }

  private generateResponseMapping(
    endpoint: PublicAPIEndpoint
  ): APIEndpoint["responseMapping"] {
    const successCodes = Object.keys(endpoint.responses || {})
      .map((code) => parseInt(code))
      .filter((code) => code >= 200 && code < 300);

    return {
      successPath: "data",
      errorPath: "error",
      statusCodes: successCodes.length > 0 ? successCodes : [200],
    };
  }

  private generateValidation(
    endpoint: PublicAPIEndpoint
  ): APIEndpoint["validation"] {
    return {
      requestSchema: endpoint.requestBody?.schema,
      responseSchema: this.extractResponseSchema(endpoint),
    };
  }

  private extractResponseSchema(endpoint: PublicAPIEndpoint): any {
    const responses = endpoint.responses || {};
    const successResponse =
      responses["200"] || responses["201"] || Object.values(responses)[0];

    return successResponse?.schema;
  }

  private generateToolName(
    endpoint: PublicAPIEndpoint,
    publicAPI: PublicAPISpec
  ): string {
    if (endpoint.id && endpoint.id !== `${endpoint.method}-${endpoint.path}`) {
      return this.toCamelCase(endpoint.id);
    }

    const summary = endpoint.summary || endpoint.description || "";
    if (summary) {
      return this.toCamelCase(summary.replace(/[^a-zA-Z0-9\s]/g, ""));
    }

    const pathParts = endpoint.path.split("/").filter(Boolean);
    const methodName = endpoint.method.toLowerCase();

    if (pathParts.length > 0) {
      const resourceName = pathParts[pathParts.length - 1].replace(
        /[^a-zA-Z0-9]/g,
        ""
      );
      return this.toCamelCase(`${methodName} ${resourceName}`);
    }

    return this.toCamelCase(
      `${methodName} ${publicAPI.name.replace(/[^a-zA-Z0-9\s]/g, "")}`
    );
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, "");
  }

  private normalizePath(path: string): string {
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    // Convert OpenAPI path parameters from {param} to :param format for Express
    return path.replace(/\{([^}]+)\}/g, ":$1");
  }

  private generateGlobalHeaders(
    publicAPI: PublicAPISpec
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "MCP-Studio/1.0.0",
    };

    // Add any common headers based on API type
    if (publicAPI.category.toLowerCase().includes("api")) {
      headers["Accept"] = "application/json";
    }

    return headers;
  }

  private convertRateLimit(
    publicAPI: PublicAPISpec
  ): APIServerConfig["rateLimit"] {
    if (!publicAPI.rateLimit) return undefined;

    let windowMs = 60000; // Default to 1 minute

    if (publicAPI.rateLimit.period) {
      if (publicAPI.rateLimit.period.includes("hour")) {
        windowMs = 3600000; // 1 hour
      } else if (publicAPI.rateLimit.period.includes("day")) {
        windowMs = 86400000; // 1 day
      } else if (publicAPI.rateLimit.period.includes("minute")) {
        windowMs = 60000; // 1 minute
      }
    }

    return {
      requests: publicAPI.rateLimit.requests,
      windowMs,
      strategy: "sliding",
    };
  }

  private generateEndpointRateLimit(
    publicAPI: PublicAPISpec
  ): APIEndpoint["rateLimit"] {
    if (!publicAPI.rateLimit) return undefined;

    return {
      requests: Math.max(1, Math.floor(publicAPI.rateLimit.requests / 10)), // More conservative per endpoint
      windowMs: 60000, // 1 minute
    };
  }

  private generateEnvironmentVariables(
    publicAPI: PublicAPISpec
  ): Record<string, string> {
    const env: Record<string, string> = {};

    // Add API-specific environment variables
    const providerKey = publicAPI.provider
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_");

    if (publicAPI.authentication?.type === "apiKey") {
      env[`${providerKey}_API_KEY`] = "";
    } else if (publicAPI.authentication?.type === "bearer") {
      env[`${providerKey}_BEARER_TOKEN`] = "";
    } else if (publicAPI.authentication?.type === "oauth2") {
      env[`${providerKey}_CLIENT_ID`] = "";
      env[`${providerKey}_CLIENT_SECRET`] = "";
    } else if (publicAPI.authentication?.type === "basic") {
      env[`${providerKey}_USERNAME`] = "";
      env[`${providerKey}_PASSWORD`] = "";
    }

    // Add base URL as environment variable
    env[`${providerKey}_BASE_URL`] = publicAPI.baseUrl;

    return env;
  }

  /**
   * Generate a preview of the MCP server code
   */
  generateServerCode(config: APIServerConfig): string {
    return `
// Auto-generated MCP Server for ${config.name}
// Generated on ${new Date().toISOString()}

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const config = ${JSON.stringify(config, null, 2)};

// Middleware
app.use(cors(${JSON.stringify({ origin: "*", credentials: true })}));
app.use(express.json());

// Rate limiting
if (${config.rateLimit ? "true" : "false"}) {
  const limiter = rateLimit(${JSON.stringify(config.rateLimit || {})});
  app.use(limiter);
}

// Authentication middleware
const authenticate = (req, res, next) => {
  const authType = '${config.authentication.type}';
  
  switch (authType) {
    case 'apikey':
      const apiKey = req.headers['${
        config.authentication.headerName?.toLowerCase() || "x-api-key"
      }'] || 
                    req.query['${
                      config.authentication.queryParam || "api_key"
                    }'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      req.auth = { apiKey };
      break;
      
    case 'bearer':
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Bearer token required' });
      }
      req.auth = { token: authHeader.substring(7) };
      break;
      
    case 'basic':
      const basicAuth = req.headers.authorization;
      if (!basicAuth || !basicAuth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Basic authentication required' });
      }
      const credentials = Buffer.from(basicAuth.substring(6), 'base64').toString().split(':');
      req.auth = { username: credentials[0], password: credentials[1] };
      break;
      
    case 'none':
    default:
      // No authentication required
      break;
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: '${config.name}',
    version: '1.0.0'
  });
});

// Tool endpoints
${config.endpoints
  .map((endpoint) => this.generateEndpointCode(endpoint, config))
  .join("\n\n")}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 ${config.name} MCP Server running on port \${PORT}\`);
  console.log(\`📖 Base URL: ${config.baseUrl}\`);
  console.log(\`🔒 Authentication: ${config.authentication.type}\`);
  console.log(\`⚡ Endpoints: ${config.endpoints.length}\`);
});

export default app;
`.trim();
  }

  private generateEndpointCode(
    endpoint: APIEndpoint,
    config: APIServerConfig
  ): string {
    const paramValidation = this.generateParameterValidationCode(
      endpoint.parameters
    );

    return `
// ${endpoint.description}
app.${endpoint.method.toLowerCase()}('${
      endpoint.path
    }', authenticate, async (req, res) => {
  try {
    ${paramValidation}
    
    // Build request URL
    const baseUrl = '${config.baseUrl}';
    const path = '${
      endpoint.path
    }'.replace(/:([^/]+)/g, (match, param) => req.params[param]);
    const url = new URL(path, baseUrl);
    
    // Add query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'MCP-Studio/1.0.0',
      ...${JSON.stringify(config.globalHeaders || {})},
      ...req.headers
    };
    
    // Add authentication headers
    ${this.generateAuthHeaderCode(config.authentication)}
    
    // Make API request
    const apiResponse = await fetch(url.toString(), {
      method: '${endpoint.method}',
      headers,
      ${
        endpoint.method !== "GET"
          ? "body: req.body ? JSON.stringify(req.body) : undefined"
          : ""
      }
    });
    
    const responseData = await apiResponse.json();
    
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        error: 'API request failed',
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        data: responseData
      });
    }
    
    // Transform response if needed
    const result = ${
      endpoint.responseMapping?.successPath
        ? `responseData.${endpoint.responseMapping.successPath} || responseData`
        : "responseData"
    };
    
    res.json({
      success: true,
      data: result,
      metadata: {
        endpoint: '${endpoint.toolName}',
        timestamp: new Date().toISOString(),
        status: apiResponse.status
      }
    });
    
  } catch (error) {
    console.error('Endpoint error:', error);
    res.status(500).json({
      error: 'Endpoint execution failed',
      message: error.message,
      endpoint: '${endpoint.toolName}',
      timestamp: new Date().toISOString()
    });
  }
});`.trim();
  }

  private generateParameterValidationCode(parameters: APIParameter[]): string {
    if (!parameters || parameters.length === 0) {
      return "// No parameter validation required";
    }

    const validationRules = parameters
      .map((param) => {
        let rule = `${param.name}: z.${param.type}()`;

        if (param.required) {
          rule += '.min(1, "Required parameter")';
        } else {
          rule += ".optional()";
        }

        if (param.validation) {
          if (param.validation.min !== undefined) {
            rule += `.min(${param.validation.min})`;
          }
          if (param.validation.max !== undefined) {
            rule += `.max(${param.validation.max})`;
          }
          if (param.validation.pattern) {
            rule += `.regex(/${param.validation.pattern}/)`;
          }
        }

        return `      ${rule}`;
      })
      .join(",\n");

    return `
    // Validate parameters
    const schema = z.object({
${validationRules}
    });
    
    const validation = schema.safeParse({ ...req.params, ...req.query, ...req.body });
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
        timestamp: new Date().toISOString()
      });
    }`.trim();
  }

  private generateAuthHeaderCode(auth: APIAuthentication): string {
    switch (auth.type) {
      case "apikey":
        return `
    if (req.auth?.apiKey) {
      headers['${auth.headerName || "X-API-Key"}'] = req.auth.apiKey;
    }`.trim();

      case "bearer":
        return `
    if (req.auth?.token) {
      headers['Authorization'] = \`Bearer \${req.auth.token}\`;
    }`.trim();

      case "basic":
        return `
    if (req.auth?.username && req.auth?.password) {
      const credentials = Buffer.from(\`\${req.auth.username}:\${req.auth.password}\`).toString('base64');
      headers['Authorization'] = \`Basic \${credentials}\`;
    }`.trim();

      default:
        return "// No authentication headers needed";
    }
  }

  /**
   * Fetch and parse OpenAPI specification to enrich the API with real endpoints and base URL
   */
  private async enrichAPIWithOpenAPISpec(
    publicAPI: PublicAPISpec
  ): Promise<PublicAPISpec> {
    try {
      // For APIs.guru APIs, we have a swaggerUrl or can construct one
      let specUrl = "";

      if (publicAPI.openApiSpec && typeof publicAPI.openApiSpec === "string") {
        specUrl = publicAPI.openApiSpec;
      } else if (publicAPI.id && publicAPI.id.includes("apis.guru")) {
        // Construct the APIs.guru URL pattern
        const parts = publicAPI.id.split(":");
        const domain = parts[0];
        const service = parts[1] || "";
        const version = publicAPI.version || "1.0.0";

        if (service) {
          specUrl = `https://api.apis.guru/v2/specs/${domain}/${service}/${version}/openapi.json`;
        } else {
          specUrl = `https://api.apis.guru/v2/specs/${domain}/${version}/openapi.json`;
        }
      }

      if (!specUrl) {
        console.warn("No OpenAPI spec URL found for API:", publicAPI.name);
        return publicAPI;
      }

      console.log("🔄 Fetching OpenAPI spec from:", specUrl);

      const response = await fetch(specUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`);
      }

      const openApiSpec = await response.json();

      // Extract the real base URL from the OpenAPI spec
      let realBaseUrl = "";
      if (openApiSpec.servers && openApiSpec.servers.length > 0) {
        realBaseUrl = openApiSpec.servers[0].url;
      } else if (openApiSpec.host) {
        const scheme =
          openApiSpec.schemes && openApiSpec.schemes.includes("https")
            ? "https"
            : "http";
        const basePath = openApiSpec.basePath || "";
        realBaseUrl = `${scheme}://${openApiSpec.host}${basePath}`;
      }

      // Extract endpoints from the OpenAPI spec
      const endpoints = this.extractEndpointsFromOpenAPI(openApiSpec);

      console.log("✅ Enriched API:", {
        name: publicAPI.name,
        originalBaseUrl: publicAPI.baseUrl,
        realBaseUrl,
        endpointsCount: endpoints.length,
      });

      return {
        ...publicAPI,
        baseUrl: realBaseUrl || publicAPI.baseUrl,
        endpoints,
        openApiSpec,
      };
    } catch (error) {
      console.error("❌ Failed to enrich API with OpenAPI spec:", error);
      return publicAPI; // Return original API if enrichment fails
    }
  }

  /**
   * Extract endpoints from OpenAPI specification
   */
  private extractEndpointsFromOpenAPI(openApiSpec: any): PublicAPIEndpoint[] {
    const endpoints: PublicAPIEndpoint[] = [];

    if (!openApiSpec.paths) {
      return endpoints;
    }

    Object.entries(openApiSpec.paths).forEach(
      ([path, pathObject]: [string, any]) => {
        Object.entries(pathObject).forEach(
          ([method, operation]: [string, any]) => {
            if (
              ["get", "post", "put", "delete", "patch"].includes(
                method.toLowerCase()
              )
            ) {
              const endpoint: PublicAPIEndpoint = {
                id: `${method}-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
                path,
                method: method.toUpperCase() as any,
                summary: operation.summary || `${method.toUpperCase()} ${path}`,
                description: operation.description || operation.summary || "",
                parameters: this.extractParametersFromOperation(
                  operation,
                  pathObject.parameters
                ),
                responses: this.extractResponsesFromOperation(operation),
                tags: operation.tags || [],
              };

              endpoints.push(endpoint);
            }
          }
        );
      }
    );

    return endpoints;
  }

  /**
   * Extract parameters from OpenAPI operation
   */
  private extractParametersFromOperation(
    operation: any,
    pathParameters?: any[]
  ): any[] {
    const parameters: any[] = [];

    // Add path-level parameters
    if (pathParameters) {
      parameters.push(...pathParameters);
    }

    // Add operation-level parameters
    if (operation.parameters) {
      parameters.push(...operation.parameters);
    }

    return parameters.map((param) => ({
      name: param.name,
      in: param.in,
      required: param.required || param.in === "path",
      type: param.schema?.type || param.type || "string",
      description: param.description || "",
      enum: param.schema?.enum || param.enum,
      default: param.schema?.default || param.default,
    }));
  }

  /**
   * Extract responses from OpenAPI operation
   */
  private extractResponsesFromOperation(operation: any): any {
    const responses: any = {};

    if (operation.responses) {
      Object.entries(operation.responses).forEach(
        ([statusCode, response]: [string, any]) => {
          responses[statusCode] = {
            description: response.description || "",
            schema: response.content
              ? Object.values(response.content)[0]
              : response.schema,
          };
        }
      );
    }

    return responses;
  }
}

export default PublicAPIToMCPService.getInstance();
