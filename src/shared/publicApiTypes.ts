export interface PublicAPISpec {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  baseUrl: string;
  provider: string;
  logo?: string;
  tags: string[];
  documentation?: string;
  authentication?: {
    type: "none" | "apiKey" | "oauth2" | "basic" | "bearer";
    description?: string;
    keyName?: string;
    keyLocation?: "header" | "query" | "cookie";
    scopes?: string[];
  };
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name?: string;
    url?: string;
  };
  rateLimit?: {
    requests: number;
    period: string;
  };
  openApiSpec?: any; // Full OpenAPI spec
  endpoints?: PublicAPIEndpoint[];
  pricing?: "free" | "freemium" | "paid";
  status: "active" | "deprecated" | "beta";
  lastUpdated: string;
  popularity?: number;
  featured?: boolean;
}

export interface PublicAPIEndpoint {
  id: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  summary: string;
  description?: string;
  parameters?: {
    name: string;
    in: "query" | "header" | "path" | "cookie" | "formData";
    required: boolean;
    type: string;
    description?: string;
    example?: any;
    enum?: any[];
    minimum?: number;
    maximum?: number;
    format?: string;
    pattern?: string;
    default?: any;
  }[];
  requestBody?: {
    required: boolean;
    contentType: string;
    schema: any;
    example?: any;
  };
  responses: {
    [statusCode: string]: {
      description: string;
      schema?: any;
      example?: any;
    };
  };
  tags?: string[];
  deprecated?: boolean;
}

export interface PublicAPICategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  count: number;
  featured?: boolean;
}

export interface PublicAPISearchFilters {
  category?: string;
  pricing?: "free" | "freemium" | "paid";
  authentication?: string;
  status?: "active" | "deprecated" | "beta";
  tags?: string[];
  search?: string;
}

export interface PublicAPITestRequest {
  apiId: string;
  endpointId: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  authentication?: {
    type: string;
    credentials: Record<string, string>;
  };
}

export interface PublicAPITestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  responseTime: number;
  size: number;
  timestamp: string;
  error?: string;
}

export interface PublicAPICollection {
  id: string;
  name: string;
  description?: string;
  apis: string[]; // API IDs
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface PublicAPISource {
  id: string;
  name: string;
  url: string;
  description: string;
  parser: "apisGuru" | "publicApis" | "rapidApi" | "custom";
  enabled: boolean;
  lastFetched?: string;
  apiCount?: number;
  categories?: string[];
}
