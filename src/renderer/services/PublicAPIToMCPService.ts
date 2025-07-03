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
            authUrl: "",
            tokenUrl: "",
            scopes: auth.scopes || [],
            flow: (auth.flow as any) || "authorization_code",
          },
        };

      case "basic":
        return {
          type: "basic",
          credentials: {},
        };

      case "digest":
        return {
          type: "digest",
          credentials: {},
          digest: {
            realm: "",
            qop: "auth",
          },
        };

      case "aws-signature":
        return {
          type: "aws-signature",
          credentials: {},
          awsSignature: {
            region: "us-east-1",
            service: "execute-api",
          },
        };

      case "mutual-tls":
        return {
          type: "mutual-tls",
          credentials: {},
          mutualTls: {},
        };

      case "custom":
        return {
          type: "custom",
          credentials: {},
          custom: {
            headers: {},
            beforeRequest: "// Custom authentication logic",
          },
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
// Enhanced with WebSocket, GraphQL, and advanced authentication support

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import WebSocket from 'ws';
import expressWs from 'express-ws';
import jwt from 'jsonwebtoken';
import aws4 from 'aws4';
import crypto from 'crypto';

const app = express();
const wsInstance = expressWs(app);
const PORT = process.env.PORT || 3000;

// Configuration
const config = ${JSON.stringify(config, null, 2)};

// Security middleware
${config.security?.helmet ? "app.use(helmet());" : "// Helmet disabled"}
${
  config.security?.cors
    ? `app.use(cors(${JSON.stringify({
        origin: config.cors?.origins || "*",
        credentials: config.cors?.credentials || true,
        methods: config.cors?.methods || [
          "GET",
          "POST",
          "PUT",
          "DELETE",
          "PATCH",
        ],
        allowedHeaders: config.cors?.headers || [
          "Content-Type",
          "Authorization",
          "X-API-Key",
        ],
      })}));`
    : "// CORS disabled"
}

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced rate limiting
${
  config.rateLimit
    ? `
const limiter = rateLimit({
  windowMs: ${config.rateLimit.windowMs || 60000},
  max: ${config.rateLimit.requests || 100},
  standardHeaders: true,
  legacyHeaders: false,
  ${
    config.rateLimit.skipSuccessfulRequests
      ? "skipSuccessfulRequests: true,"
      : ""
  }
  ${config.rateLimit.skipFailedRequests ? "skipFailedRequests: true," : ""}
  ${
    config.rateLimit.keyGenerator
      ? `keyGenerator: ${config.rateLimit.keyGenerator},`
      : ""
  }
  message: {
    error: 'Too many requests',
    retryAfter: 60
  }
});
app.use(limiter);`
    : "// Rate limiting disabled"
}

// Enhanced authentication middleware
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

    case 'jwt':
      const jwtHeader = req.headers.authorization;
      if (!jwtHeader || !jwtHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'JWT token required' });
      }
      try {
        const token = jwtHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        req.auth = { user: decoded };
      } catch (error) {
        return res.status(401).json({ error: 'Invalid JWT token' });
      }
      break;

    case 'digest':
      const digestAuth = req.headers.authorization;
      if (!digestAuth || !digestAuth.startsWith('Digest ')) {
        return res.status(401).json({ 
          error: 'Digest authentication required',
          'WWW-Authenticate': 'Digest realm="${
            config.authentication.digest?.realm || "api"
          }", qop="auth", nonce="' + crypto.randomUUID() + '"'
        });
      }
      // Digest auth parsing logic would go here
      req.auth = { digest: true };
      break;

    case 'aws-signature':
      // AWS signature validation would go here
      req.auth = { aws: true };
      break;

    case 'mutual-tls':
      if (!req.client.authorized) {
        return res.status(401).json({ error: 'Client certificate required' });
      }
      req.auth = { cert: req.client.getPeerCertificate() };
      break;

    case 'custom':
      ${
        config.authentication.custom?.beforeRequest ||
        "// Custom authentication logic"
      }
      break;
      
    case 'none':
    default:
      // No authentication required
      break;
  }
  
  next();
};

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const healthData = { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: '${config.name}',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    endpoints: ${config.endpoints.length},
    authentication: '${config.authentication.type}'
  };

  ${
    config.monitoring?.healthCheck?.enabled
      ? `
  // Additional health checks
  healthData.database = 'connected'; // Add actual DB check
  healthData.externalServices = 'operational'; // Add external service checks
  `
      : ""
  }

  res.json(healthData);
});

// Metrics endpoint
${
  config.monitoring?.metrics?.enabled
    ? `
app.get('/metrics', (req, res) => {
  const metrics = {
    requests_total: global.requestCount || 0,
    errors_total: global.errorCount || 0,
    response_time_avg: global.avgResponseTime || 0,
    active_connections: global.activeConnections || 0,
    timestamp: new Date().toISOString()
  };
  
  if ('${config.monitoring.metrics.exportFormat}' === 'prometheus') {
    let prometheusMetrics = '';
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        prometheusMetrics += \`# TYPE \${key} gauge\\n\${key} \${value}\\n\`;
      }
    });
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } else {
    res.json(metrics);
  }
});`
    : "// Metrics disabled"
}

// Request logging and metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  ${
    config.logging?.requests
      ? `
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path}\`);
  `
      : ""
  }
  
  // Track metrics
  global.requestCount = (global.requestCount || 0) + 1;
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    global.avgResponseTime = ((global.avgResponseTime || 0) + responseTime) / 2;
    
    if (res.statusCode >= 400) {
      global.errorCount = (global.errorCount || 0) + 1;
    }
    
    ${
      config.logging?.responses
        ? `
    console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path} - \${res.statusCode} - \${responseTime}ms\`);
    `
        : ""
    }
  });
  
  next();
});

// Generated API endpoints
${config.endpoints
  .filter((endpoint) => endpoint.enabled)
  .map((endpoint) => this.generateEndpointCode(endpoint, config))
  .join("\n\n")}

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  ${
    config.monitoring?.alerts?.enabled
      ? `
  // Send alert if error threshold exceeded
  global.errorCount = (global.errorCount || 0) + 1;
  if (global.errorCount > ${config.monitoring.alerts.errorThreshold || 10}) {
    // Send webhook alert
    fetch('${config.monitoring.alerts.webhookUrl || ""}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: 'High error rate',
        service: '${config.name}',
        errorCount: global.errorCount,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  }
  `
      : ""
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: ${
      config.logging?.level === "debug" ? "error.message" : "'Server error'"
    },
    timestamp: new Date().toISOString(),
    requestId: req.id || crypto.randomUUID()
  });
});

// Start server with enhanced configuration
${
  config.websocket?.enabled
    ? `
const server = app.listen(PORT, () => {
  console.log(\`🚀 \${config.name} MCP Server running on port \${PORT}\`);
  console.log(\`📖 Base URL: \${config.baseUrl}\`);
  console.log(\`🔒 Authentication: \${config.authentication.type}\`);
  console.log(\`⚡ Endpoints: \${config.endpoints.length}\`);
  console.log(\`🔌 WebSocket: Enabled\`);
  console.log(\`📊 Metrics: \${config.monitoring?.metrics?.enabled ? 'Enabled' : 'Disabled'}\`);
});

// WebSocket server setup
global.activeConnections = 0;
`
    : `
app.listen(PORT, () => {
  console.log(\`🚀 \${config.name} MCP Server running on port \${PORT}\`);
  console.log(\`📖 Base URL: \${config.baseUrl}\`);
  console.log(\`🔒 Authentication: \${config.authentication.type}\`);
  console.log(\`⚡ Endpoints: \${config.endpoints.length}\`);
  console.log(\`📊 Metrics: \${config.monitoring?.metrics?.enabled ? 'Enabled' : 'Disabled'}\`);
});`
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  ${config.websocket?.enabled ? "server.close(() => {" : ""}
    console.log('Server closed');
    process.exit(0);
  ${config.websocket?.enabled ? "});" : ""}
});

export default app;
`.trim();
  }
  private generateEndpointCode(
    endpoint: APIEndpoint,
    config: APIServerConfig
  ): string {
    // Handle different endpoint types
    switch (endpoint.method) {
      case "WEBSOCKET":
        return this.generateWebSocketEndpointCode(endpoint, config);
      case "GRAPHQL":
        return this.generateGraphQLEndpointCode(endpoint, config);
      default:
        return this.generateRESTEndpointCode(endpoint, config);
    }
  }

  private generateRESTEndpointCode(
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
    
    // Execute middleware before request
    ${
      endpoint.middleware?.beforeRequest
        ?.map((mw) => `${mw}(req, res);`)
        .join("\n    ") || ""
    }
    
    // Make API request with retry logic
    let apiResponse;
    let attempt = 0;
    const maxRetries = ${endpoint.retries?.count || 3};
    
    while (attempt <= maxRetries) {
      try {
        apiResponse = await fetch(url.toString(), {
          method: '${endpoint.method}',
          headers,
          ${
            endpoint.method !== "GET"
              ? "body: req.body ? JSON.stringify(req.body) : undefined,"
              : ""
          }
          timeout: ${endpoint.timeout || 30000},
          ${config.ssl?.verify === false ? "rejectUnauthorized: false," : ""}
        });
        break;
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) throw error;
        
        const delay = ${endpoint.retries?.delay || 1000} * Math.pow(${
      endpoint.retries?.backoff === "exponential" ? 2 : 1
    }, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
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
    
    // Execute middleware after response
    ${
      endpoint.middleware?.afterResponse
        ?.map((mw) => `${mw}(req, res, result);`)
        .join("\n    ") || ""
    }
    
    res.json({
      success: true,
      data: result,
      metadata: {
        endpoint: '${endpoint.toolName}',
        timestamp: new Date().toISOString(),
        status: apiResponse.status,
        cached: false
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

  private generateWebSocketEndpointCode(
    endpoint: APIEndpoint,
    config: APIServerConfig
  ): string {
    return `
// WebSocket endpoint: ${endpoint.description}
const WebSocket = require('ws');

app.ws('${endpoint.path}', (ws, req) => {
  console.log('WebSocket connection established for ${endpoint.toolName}');
  
  // Setup heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, ${endpoint.websocket?.heartbeat || 30000});
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Custom message handler
      ${
        endpoint.websocket?.messageHandler ||
        `
      // Echo message back
      ws.send(JSON.stringify({
        type: 'response',
        data: data,
        timestamp: new Date().toISOString()
      }));`
      }
      
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle connection events
  ws.on('close', () => {
    console.log('WebSocket connection closed for ${endpoint.toolName}');
    clearInterval(heartbeat);
    
    ${endpoint.websocket?.connectionHandler || "// Custom close handler"}
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(heartbeat);
  });
});`.trim();
  }

  private generateGraphQLEndpointCode(
    endpoint: APIEndpoint,
    config: APIServerConfig
  ): string {
    return `
// GraphQL endpoint: ${endpoint.description}
app.post('${endpoint.path}', authenticate, async (req, res) => {
  try {
    const { query, variables, operationName } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'GraphQL query is required'
      });
    }
    
    // Prepare GraphQL request
    const graphqlRequest = {
      query,
      variables: variables || {},
      operationName
    };
    
    // Make request to GraphQL endpoint
    const response = await fetch('${config.baseUrl}${endpoint.path}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...${JSON.stringify(config.globalHeaders || {})},
      },
      body: JSON.stringify(graphqlRequest)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'GraphQL request failed',
        status: response.status,
        data: result
      });
    }
    
    res.json({
      success: true,
      data: result,
      metadata: {
        endpoint: '${endpoint.toolName}',
        operationType: '${endpoint.graphql?.operationType || "query"}',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('GraphQL endpoint error:', error);
    res.status(500).json({
      error: 'GraphQL execution failed',
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

      case "oauth2":
        return `
    // OAuth2 authentication with automatic token management
    if (req.auth?.accessToken) {
      headers['Authorization'] = \`Bearer \${req.auth.accessToken}\`;
    } else {
      // Token missing or expired - should trigger re-authentication
      return res.status(401).json({ 
        error: 'OAuth2 token required',
        authRequired: true,
        authUrl: '${auth.oauth2?.authUrl || ""}',
        message: 'Please complete OAuth2 authentication flow'
      });
    }`.trim();

      case "digest":
        return `
    if (req.auth?.username && req.auth?.password) {
      // Digest authentication implementation
      const ha1 = require('crypto').createHash('md5').update(\`\${req.auth.username}:\${auth.digest?.realm || 'api'}:\${req.auth.password}\`).digest('hex');
      const ha2 = require('crypto').createHash('md5').update(\`\${req.method}:\${req.path}\`).digest('hex');
      const response = require('crypto').createHash('md5').update(\`\${ha1}:\${req.auth.nonce}:\${ha2}\`).digest('hex');
      headers['Authorization'] = \`Digest username="\${req.auth.username}", realm="\${auth.digest?.realm || 'api'}", nonce="\${req.auth.nonce}", uri="\${req.path}", response="\${response}"\`;
    }`.trim();

      case "aws-signature":
        return `
    if (req.auth?.accessKeyId && req.auth?.secretAccessKey) {
      const aws4 = require('aws4');
      const opts = {
        service: '${auth.awsSignature?.service || "execute-api"}',
        region: '${auth.awsSignature?.region || "us-east-1"}',
        method: req.method,
        path: req.path,
        headers: headers,
        body: req.body ? JSON.stringify(req.body) : undefined
      };
      aws4.sign(opts, {
        accessKeyId: req.auth.accessKeyId,
        secretAccessKey: req.auth.secretAccessKey,
        sessionToken: req.auth.sessionToken
      });
      Object.assign(headers, opts.headers);
    }`.trim();

      case "jwt":
        return `
    if (req.auth?.secret) {
      const jwt = require('jsonwebtoken');
      const payload = {
        iss: '${auth.jwt?.issuer || "mcp-studio"}',
        aud: '${auth.jwt?.audience || "api"}',
        sub: '${auth.jwt?.subject || "user"}',
        exp: Math.floor(Date.now() / 1000) + (${auth.jwt?.expiresIn || "3600"})
      };
      const token = jwt.sign(payload, req.auth.secret, { algorithm: '${
        auth.jwt?.algorithm || "HS256"
      }' });
      headers['Authorization'] = \`Bearer \${token}\`;
    }`.trim();

      case "mutual-tls":
        return `
    // mTLS configuration handled at request level
    // Client certificates should be configured in the request options
    `.trim();

      case "custom":
        return `
    // Custom authentication headers
    ${Object.entries(auth.custom?.headers || {})
      .map(([key, value]) => `headers['${key}'] = '${value}';`)
      .join("\n    ")}
    
    // Custom authentication logic
    ${
      auth.custom?.beforeRequest || "// Add custom authentication logic here"
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
