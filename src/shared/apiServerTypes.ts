export interface APIParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  description?: string;
  defaultValue?: any;
  enum?: string[];
  example?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    format?: "email" | "uri" | "date" | "date-time" | "uuid";
  };
}

export interface APIEndpoint {
  id: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  toolName: string;
  description: string;
  parameters: APIParameter[];
  headers?: Record<string, string>;
  body?: {
    type: "json" | "form" | "text" | "multipart";
    schema?: any;
    required?: boolean;
  };
  responseMapping?: {
    successPath?: string;
    errorPath?: string;
    dataTransform?: string;
    statusCodes?: number[];
  };
  validation?: {
    requestSchema?: any;
    responseSchema?: any;
  };
  caching?: {
    enabled: boolean;
    ttl?: number;
    key?: string;
  };
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  timeout?: number;
  retries?: {
    count: number;
    delay: number;
    backoff?: "linear" | "exponential";
  };
  enabled: boolean;
}

export interface APIAuthentication {
  type: "none" | "bearer" | "apikey" | "basic" | "oauth2" | "jwt" | "custom";
  credentials: Record<string, string>;
  headerName?: string; // for API key authentication
  queryParam?: string; // for API key in query
  oauth2?: {
    authUrl?: string;
    tokenUrl?: string;
    scopes?: string[];
    clientId?: string;
    clientSecret?: string;
  };
  jwt?: {
    secret?: string;
    algorithm?: string;
    expiresIn?: string;
  };
  custom?: {
    headers?: Record<string, string>;
    beforeRequest?: string; // JavaScript code to execute
  };
}

export interface APIServerConfig {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  authentication: APIAuthentication;
  endpoints: APIEndpoint[];
  globalHeaders?: Record<string, string>;
  rateLimit?: {
    requests: number;
    windowMs: number;
    strategy?: "sliding" | "fixed";
  };
  timeout?: number;
  retries?: number;
  environment?: Record<string, string>; // Environment variables
  proxy?: {
    enabled: boolean;
    url?: string;
    auth?: {
      username: string;
      password: string;
    };
  };
  ssl?: {
    verify: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };
  monitoring?: {
    enabled: boolean;
    healthCheck?: {
      enabled?: boolean;
      endpoint?: string;
      interval?: number;
    };
    metrics?: {
      enabled: boolean;
      endpoint?: string;
      retention?: number;
    };
  };
  caching?: {
    enabled: boolean;
    defaultTtl?: number;
    maxSize?: number;
  };
  logging?: {
    level: "debug" | "info" | "warn" | "error";
    requests: boolean;
    responses: boolean;
    errors: boolean;
  };
  cors?: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
  };
  security?: {
    rateLimit: boolean;
    cors: boolean;
    validation: boolean;
  };
  apiVersion?: string;
  openApiSpec?: string;
  tags?: string[];
  category?: string;
  provider?: string;
  documentation?: string;
  license?: {
    name?: string;
    url?: string;
  };
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  created: Date;
  updated: Date;
}

export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  security?: Array<Record<string, any>>;
}

export interface APITestResult {
  endpointId: string;
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  responseData?: any;
  error?: string;
  timestamp: Date;
  requestSize?: number;
  responseSize?: number;
  headers?: Record<string, string>;
  cached?: boolean;
}

export interface APIServerStatus {
  id: string;
  status: "running" | "stopped" | "error" | "starting" | "stopping";
  connected?: boolean;
  pid?: number;
  port?: number;
  startTime?: Date;
  lastTest?: Date;
  testResults?: APITestResult[];
  totalRequests?: number;
  lastError?: string;
  toolsAvailable?: number;
  lastHealth?: Date;
  performance?: {
    avgResponseTime?: number;
    errorRate?: number;
    requestsPerMinute?: number;
    uptime?: number;
  };
  memory?: {
    used?: number;
    limit?: number;
  };
  cache?: {
    hitRate?: number;
    size?: number;
  };
}

export interface APITemplate {
  id: string;
  name: string;
  description: string;
  category: "rest" | "graphql" | "soap" | "webhook";
  config: Partial<APIServerConfig>;
  endpoints: Partial<APIEndpoint>[];
  tags: string[];
}

export interface APIServerMetrics {
  serverId: string;
  timestamp: Date;
  requests: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
  };
  endpoints: {
    [endpointId: string]: {
      requests: number;
      avgResponseTime: number;
      errorRate: number;
    };
  };
  system: {
    memory: number;
    cpu: number;
  };
}
