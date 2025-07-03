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
  method:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "HEAD"
    | "OPTIONS"
    | "WEBSOCKET"
    | "GRAPHQL";
  toolName: string;
  description: string;
  parameters: APIParameter[];
  headers?: Record<string, string>;
  body?: {
    type: "json" | "form" | "text" | "multipart" | "graphql" | "binary";
    schema?: any;
    required?: boolean;
    query?: string; // For GraphQL queries
    variables?: Record<string, any>; // For GraphQL variables
  };
  responseMapping?: {
    successPath?: string;
    errorPath?: string;
    dataTransform?: string;
    statusCodes?: number[];
    streamHandler?: string; // For WebSocket/SSE responses
  };
  validation?: {
    requestSchema?: any;
    responseSchema?: any;
    customValidation?: string; // JavaScript validation function
  };
  caching?: {
    enabled: boolean;
    ttl?: number;
    key?: string;
    conditions?: string[]; // Cache conditions
    invalidateOn?: string[]; // Events that invalidate cache
  };
  rateLimit?: {
    requests: number;
    windowMs: number;
    skipIf?: string; // JavaScript condition to skip rate limiting
  };
  timeout?: number;
  retries?: {
    count: number;
    delay: number;
    backoff?: "linear" | "exponential";
    condition?: string; // JavaScript condition for retries
  };
  websocket?: {
    protocols?: string[];
    heartbeat?: number;
    messageHandler?: string; // JavaScript function to handle messages
    connectionHandler?: string; // JavaScript function for connection events
  };
  graphql?: {
    operationType?: "query" | "mutation" | "subscription";
    schema?: string;
    introspection?: boolean;
  };
  middleware?: {
    beforeRequest?: string[];
    afterResponse?: string[];
  };
  enabled: boolean;
}

export interface APIAuthentication {
  type:
    | "none"
    | "bearer"
    | "apikey"
    | "basic"
    | "oauth2"
    | "jwt"
    | "custom"
    | "digest"
    | "aws-signature"
    | "mutual-tls";
  credentials: Record<string, string>;
  headerName?: string; // for API key authentication
  queryParam?: string; // for API key in query
  oauth2?: {
    authUrl?: string;
    tokenUrl?: string;
    scopes?: string[];
    clientId?: string;
    clientSecret?: string;
    flow?:
      | "authorization_code"
      | "client_credentials"
      | "password"
      | "implicit"
      | "pkce";
    redirectUri?: string;
    codeChallenge?: string;
    codeChallengeMethod?: "S256" | "plain";
    refreshToken?: string;
    accessToken?: string;
    tokenExpiry?: number;
  };
  jwt?: {
    secret?: string;
    algorithm?: string;
    expiresIn?: string;
    issuer?: string;
    audience?: string;
    subject?: string;
  };
  custom?: {
    headers?: Record<string, string>;
    beforeRequest?: string; // JavaScript code to execute
    afterRequest?: string; // JavaScript code to execute after request
  };
  digest?: {
    realm?: string;
    qop?: string;
    nc?: string;
    cnonce?: string;
  };
  awsSignature?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    service?: string;
    sessionToken?: string;
  };
  mutualTls?: {
    clientCert?: string;
    clientKey?: string;
    caCert?: string;
    passphrase?: string;
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
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: string; // JavaScript function for custom keys
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
    bypassHosts?: string[];
  };
  ssl?: {
    verify: boolean;
    cert?: string;
    key?: string;
    ca?: string;
    rejectUnauthorized?: boolean;
    secureProtocol?: string;
  };
  monitoring?: {
    enabled: boolean;
    healthCheck?: {
      enabled?: boolean;
      endpoint?: string;
      interval?: number;
      timeout?: number;
      expectedStatus?: number[];
      retries?: number;
    };
    metrics?: {
      enabled: boolean;
      endpoint?: string;
      retention?: number;
      exportFormat?: "prometheus" | "json" | "custom";
    };
    alerts?: {
      enabled: boolean;
      errorThreshold?: number;
      responseTimeThreshold?: number;
      webhookUrl?: string;
    };
  };
  caching?: {
    enabled: boolean;
    defaultTtl?: number;
    maxSize?: number;
    strategy?: "lru" | "lfu" | "fifo";
    compression?: boolean;
  };
  logging?: {
    level: "debug" | "info" | "warn" | "error";
    requests: boolean;
    responses: boolean;
    errors: boolean;
    format?: "json" | "text" | "structured";
    redactFields?: string[];
  };
  cors?: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  security?: {
    rateLimit: boolean;
    cors: boolean;
    validation: boolean;
    sanitization?: boolean;
    xss?: boolean;
    helmet?: boolean;
  };
  websocket?: {
    enabled: boolean;
    pingInterval?: number;
    pingTimeout?: number;
    maxConnections?: number;
    compression?: boolean;
  };
  graphql?: {
    enabled: boolean;
    playground?: boolean;
    introspection?: boolean;
    tracing?: boolean;
    cacheControl?: boolean;
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
