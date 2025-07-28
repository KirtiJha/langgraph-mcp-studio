import {
  APIServerConfig,
  APIEndpoint,
  APIAuthentication,
  APIParameter,
} from "../../shared/apiServerTypes";
import { v4 as uuidv4 } from "uuid";

// Postman Collection v2.1 interfaces
interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema?: string;
    version?: string;
  };
  item: PostmanItem[];
  auth?: PostmanAuth;
  variable?: PostmanVariable[];
  event?: PostmanEvent[];
}

interface PostmanItem {
  name: string;
  description?: string;
  request?: PostmanRequest;
  response?: PostmanResponse[];
  item?: PostmanItem[]; // For folders
  event?: PostmanEvent[];
}

interface PostmanRequest {
  url: PostmanUrl | string;
  method: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  auth?: PostmanAuth;
  description?: string;
}

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  port?: string;
  path?: string[];
  query?: PostmanQueryParam[];
  variable?: PostmanVariable[];
}

interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

interface PostmanQueryParam {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  description?: string;
}

interface PostmanAuth {
  type: string;
  [key: string]: any;
}

interface PostmanBody {
  mode: "raw" | "urlencoded" | "formdata" | "file" | "graphql";
  raw?: string;
  urlencoded?: Array<{ key: string; value: string; disabled?: boolean }>;
  formdata?: Array<{
    key: string;
    value: string;
    type?: string;
    disabled?: boolean;
  }>;
  graphql?: {
    query?: string;
    variables?: string;
  };
  file?: {
    src: string;
  };
  options?: {
    raw?: {
      language?: string;
    };
  };
}

interface PostmanResponse {
  name: string;
  originalRequest: PostmanRequest;
  status: string;
  code: number;
  header: PostmanHeader[];
  body: string;
}

interface PostmanEvent {
  listen: string;
  script: {
    type: string;
    exec: string[];
  };
}

export class PostmanCollectionService {
  private static instance: PostmanCollectionService;

  public static getInstance(): PostmanCollectionService {
    if (!PostmanCollectionService.instance) {
      PostmanCollectionService.instance = new PostmanCollectionService();
    }
    return PostmanCollectionService.instance;
  }

  private constructor() {}

  /**
   * Parse a Postman Collection v2.1 JSON and convert it to an MCP API Server Configuration
   */
  parsePostmanCollection(collectionJson: string): APIServerConfig {
    try {
      const collection: PostmanCollection = JSON.parse(collectionJson);

      // Validate it's a Postman collection
      if (!this.isValidPostmanCollection(collection)) {
        throw new Error(
          "Invalid Postman Collection format. Expected Postman Collection v2.1 schema."
        );
      }

      // Extract basic configuration
      const config: APIServerConfig = {
        id: `postman-${Date.now()}`,
        name: collection.info.name || "Postman API Server",
        description:
          collection.info.description ||
          "API server generated from Postman collection",
        baseUrl: this.extractBaseUrl(collection),
        authentication: this.extractAuthentication(collection),
        endpoints: this.extractEndpoints(collection),
        globalHeaders: this.extractGlobalHeaders(collection),
        timeout: 30000,
        retries: 3,
        created: new Date(),
        updated: new Date(),
        // Add Postman-specific metadata
        ...(collection.info.version && { apiVersion: collection.info.version }),
        tags: ["postman", "imported"],
        category: "Imported",
        provider: "Postman Collection",
        environment: this.extractEnvironmentVariables(collection),
        monitoring: {
          enabled: true,
          healthCheck: {
            enabled: true,
            endpoint: "/health",
            interval: 300000,
          },
          metrics: {
            enabled: true,
            endpoint: "/metrics",
          },
        },
        logging: {
          level: "info",
          requests: true,
          responses: true,
          errors: true,
        },
        cors: {
          enabled: true,
          origins: ["*"],
          methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          headers: ["Content-Type", "Authorization", "X-API-Key"],
        },
        security: {
          rateLimit: true,
          cors: true,
          validation: true,
        },
      };

      return config;
    } catch (error) {
      console.error("Failed to parse Postman collection:", error);
      throw new Error(
        `Failed to parse Postman collection: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Validate if the JSON is a valid Postman Collection
   */
  private isValidPostmanCollection(data: any): data is PostmanCollection {
    return (
      data &&
      typeof data === "object" &&
      data.info &&
      typeof data.info.name === "string" &&
      Array.isArray(data.item) &&
      (data.info.schema?.includes("collection") ||
        data.info.schema?.includes("postman") ||
        // Fallback: if it has the basic structure but no schema
        (!data.info.schema && data.info.name && Array.isArray(data.item)))
    );
  }

  /**
   * Extract base URL from collection variables or first request
   */
  private extractBaseUrl(collection: PostmanCollection): string {
    // Check for base URL in collection variables
    if (collection.variable) {
      const baseUrlVar = collection.variable.find(
        (v) =>
          v.key.toLowerCase().includes("baseurl") ||
          v.key.toLowerCase().includes("host") ||
          v.key.toLowerCase().includes("url")
      );
      if (baseUrlVar?.value) {
        return this.normalizeUrl(baseUrlVar.value);
      }
    }

    // Extract from the first request
    const firstRequest = this.findFirstRequest(collection.item);
    if (firstRequest) {
      const url = this.parseUrl(firstRequest.url);
      if (url.protocol && url.host) {
        const baseUrl = `${url.protocol}://${url.host.join(".")}${
          url.port ? `:${url.port}` : ""
        }`;
        return this.normalizeUrl(baseUrl);
      }
    }

    return "https://api.example.com";
  }

  /**
   * Extract authentication configuration from collection
   */
  private extractAuthentication(
    collection: PostmanCollection
  ): APIAuthentication {
    if (!collection.auth) {
      return { type: "none", credentials: {} };
    }

    const auth = collection.auth;

    switch (auth.type?.toLowerCase()) {
      case "apikey":
        return {
          type: "apikey",
          credentials: {},
          headerName:
            auth.apikey?.find((item: any) => item.key === "in")?.value ===
            "header"
              ? auth.apikey?.find((item: any) => item.key === "key")?.value ||
                "X-API-Key"
              : undefined,
          queryParam:
            auth.apikey?.find((item: any) => item.key === "in")?.value ===
            "query"
              ? auth.apikey?.find((item: any) => item.key === "key")?.value ||
                "api_key"
              : undefined,
        };

      case "bearer":
      case "oauth2":
        return {
          type: "bearer",
          credentials: {},
        };

      case "basic":
        return {
          type: "basic",
          credentials: {},
        };

      case "jwt":
        return {
          type: "jwt",
          credentials: {},
        };

      case "digest":
        return {
          type: "digest",
          credentials: {},
          digest: {
            realm: auth.digest?.realm,
            qop: auth.digest?.qop,
          },
        };

      default:
        return {
          type: "custom",
          credentials: {},
          custom: {
            headers: {},
            beforeRequest: `// Custom authentication for ${auth.type}`,
          },
        };
    }
  }

  /**
   * Extract all endpoints from the collection (including nested folders)
   */
  private extractEndpoints(collection: PostmanCollection): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    const processItems = (items: PostmanItem[], folderPath: string = "") => {
      items.forEach((item) => {
        if (item.request) {
          // This is a request item
          const endpoint = this.convertRequestToEndpoint(item, folderPath);
          if (endpoint) {
            endpoints.push(endpoint);
          }
        } else if (item.item) {
          // This is a folder, process recursively
          const newFolderPath = folderPath
            ? `${folderPath}/${item.name}`
            : item.name;
          processItems(item.item, newFolderPath);
        }
      });
    };

    processItems(collection.item);
    return endpoints;
  }

  /**
   * Convert a Postman request to an API endpoint
   */
  private convertRequestToEndpoint(
    item: PostmanItem,
    folderPath: string
  ): APIEndpoint | null {
    if (!item.request) return null;

    const request = item.request;
    const url = this.parseUrl(request.url);

    // Generate a tool name from the request name and folder path
    const toolName = this.generateToolName(item.name, folderPath);

    // Extract parameters from URL query, path variables, and headers
    const parameters: APIParameter[] = [];

    // Add query parameters
    if (url.query) {
      url.query.forEach((param) => {
        if (!param.disabled) {
          parameters.push({
            name: param.key,
            type: "string",
            required: false,
            description: param.description || `Query parameter: ${param.key}`,
            defaultValue: param.value || undefined,
          });
        }
      });
    }

    // Add path variables
    if (url.variable) {
      url.variable.forEach((variable) => {
        parameters.push({
          name: variable.key,
          type: "string",
          required: true,
          description:
            variable.description || `Path parameter: ${variable.key}`,
          defaultValue: variable.value || undefined,
        });
      });
    }

    // Add header parameters (excluding auth headers)
    if (request.header) {
      request.header.forEach((header) => {
        if (!header.disabled && !this.isAuthHeader(header.key)) {
          parameters.push({
            name: header.key,
            type: "string",
            required: false,
            description:
              header.description || `Header parameter: ${header.key}`,
            defaultValue: header.value || undefined,
          });
        }
      });
    }

    // Extract request body if present
    let requestBody: APIEndpoint["body"] | undefined;
    if (request.body && request.method.toUpperCase() !== "GET") {
      requestBody = this.convertPostmanBody(request.body);

      // Add body parameters for form data
      if (request.body.mode === "urlencoded" && request.body.urlencoded) {
        request.body.urlencoded.forEach((param) => {
          if (!param.disabled) {
            parameters.push({
              name: param.key,
              type: "string",
              required: false,
              description: `Form parameter: ${param.key}`,
              defaultValue: param.value || undefined,
            });
          }
        });
      }
    }

    const endpoint: APIEndpoint = {
      id: `postman-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      path: this.extractPath(url),
      method: request.method.toUpperCase() as APIEndpoint["method"],
      toolName,
      description:
        item.description ||
        request.description ||
        `${request.method.toUpperCase()} ${this.extractPath(url)}`,
      parameters,
      headers: this.extractRequestHeaders(request),
      body: requestBody,
      enabled: true,
      validation: {
        requestSchema: this.generateRequestSchema(parameters, requestBody),
      },
      caching: {
        enabled: request.method.toUpperCase() === "GET",
        ttl: 300, // 5 minutes for GET requests
      },
    };

    return endpoint;
  }

  /**
   * Parse Postman URL object or string
   */
  private parseUrl(url: PostmanUrl | string): PostmanUrl {
    if (typeof url === "string") {
      try {
        const parsed = new URL(url);
        return {
          raw: url,
          protocol: parsed.protocol.replace(":", ""),
          host: [parsed.hostname],
          port: parsed.port,
          path: parsed.pathname.split("/").filter(Boolean),
          query: Array.from(parsed.searchParams.entries()).map(
            ([key, value]) => ({
              key,
              value,
            })
          ),
        };
      } catch {
        return {
          raw: url,
          path: [url],
        };
      }
    }
    return url;
  }

  /**
   * Extract the path from a parsed URL
   */
  private extractPath(url: PostmanUrl): string {
    if (!url.path || url.path.length === 0) {
      return "/";
    }

    // Convert Postman path variables to OpenAPI format
    const path =
      "/" +
      url.path
        .map((segment) => {
          // Check if segment is a variable (contains {{}} or :variable format)
          if (segment.includes("{{") && segment.includes("}}")) {
            const variableName = segment.replace(/[{}]/g, "");
            return `{${variableName}}`;
          } else if (segment.startsWith(":")) {
            const variableName = segment.substring(1);
            return `{${variableName}}`;
          }
          return segment;
        })
        .join("/");

    return path;
  }

  /**
   * Generate a tool name from request name and folder path
   */
  private generateToolName(requestName: string, folderPath: string): string {
    const fullName = folderPath ? `${folderPath}_${requestName}` : requestName;

    // Convert to camelCase and remove special characters
    return fullName
      .replace(/[^a-zA-Z0-9\s_-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_")
      .split("_")
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("")
      .replace(/^[0-9]/, "endpoint_$&"); // Ensure it doesn't start with a number
  }

  /**
   * Convert Postman body to API endpoint body format
   */
  private convertPostmanBody(body: PostmanBody): APIEndpoint["body"] {
    switch (body.mode) {
      case "raw":
        const language = body.options?.raw?.language?.toLowerCase();
        if (language === "json" || !language) {
          try {
            JSON.parse(body.raw || "{}");
            return {
              type: "json",
              required: true,
              schema: this.inferJsonSchema(body.raw || "{}"),
            };
          } catch {
            return {
              type: "text",
              required: true,
            };
          }
        }
        return {
          type: "text",
          required: true,
        };

      case "urlencoded":
        return {
          type: "form",
          required: true,
          schema: this.generateFormSchema(body.urlencoded || []),
        };

      case "formdata":
        return {
          type: "multipart",
          required: true,
          schema: this.generateFormDataSchema(body.formdata || []),
        };

      case "graphql":
        return {
          type: "graphql",
          required: true,
          query: body.graphql?.query,
          variables: body.graphql?.variables
            ? JSON.parse(body.graphql.variables)
            : undefined,
        };

      case "file":
        return {
          type: "binary",
          required: true,
        };

      default:
        return {
          type: "json",
          required: true,
        };
    }
  }

  /**
   * Extract global headers from collection
   */
  private extractGlobalHeaders(
    collection: PostmanCollection
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    // Default headers for generated servers
    headers["Content-Type"] = "application/json";
    headers["User-Agent"] = "MCP-Studio/1.0.0";

    return headers;
  }

  /**
   * Extract environment variables from collection
   */
  private extractEnvironmentVariables(
    collection: PostmanCollection
  ): Record<string, string> {
    const env: Record<string, string> = {};

    if (collection.variable) {
      collection.variable.forEach((variable) => {
        env[variable.key.toUpperCase()] = variable.value || "";
      });
    }

    return env;
  }

  /**
   * Helper functions
   */
  private findFirstRequest(items: PostmanItem[]): PostmanRequest | null {
    for (const item of items) {
      if (item.request) {
        return item.request;
      }
      if (item.item) {
        const found = this.findFirstRequest(item.item);
        if (found) return found;
      }
    }
    return null;
  }

  private normalizeUrl(url: string): string {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `https://${url}`;
    }
    return url.replace(/\/+$/, ""); // Remove trailing slashes
  }

  private isAuthHeader(headerName: string): boolean {
    const authHeaders = [
      "authorization",
      "x-api-key",
      "x-auth-token",
      "x-access-token",
      "bearer",
      "cookie",
    ];
    return authHeaders.includes(headerName.toLowerCase());
  }

  private extractRequestHeaders(
    request: PostmanRequest
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (request.header) {
      request.header.forEach((header) => {
        if (!header.disabled && !this.isAuthHeader(header.key)) {
          headers[header.key] = header.value;
        }
      });
    }

    return headers;
  }

  private inferJsonSchema(jsonString: string): any {
    try {
      const parsed = JSON.parse(jsonString);
      return this.generateSchemaFromObject(parsed);
    } catch {
      return { type: "object" };
    }
  }

  private generateSchemaFromObject(obj: any): any {
    if (obj === null) return { type: "null" };
    if (typeof obj === "string") return { type: "string" };
    if (typeof obj === "number") return { type: "number" };
    if (typeof obj === "boolean") return { type: "boolean" };
    if (Array.isArray(obj)) {
      return {
        type: "array",
        items:
          obj.length > 0
            ? this.generateSchemaFromObject(obj[0])
            : { type: "string" },
      };
    }
    if (typeof obj === "object") {
      const properties: any = {};
      Object.keys(obj).forEach((key) => {
        properties[key] = this.generateSchemaFromObject(obj[key]);
      });
      return {
        type: "object",
        properties,
      };
    }
    return { type: "string" };
  }

  private generateFormSchema(
    formData: Array<{ key: string; value: string; disabled?: boolean }>
  ): any {
    const properties: any = {};

    formData.forEach((field) => {
      if (!field.disabled) {
        properties[field.key] = { type: "string" };
      }
    });

    return {
      type: "object",
      properties,
    };
  }

  private generateFormDataSchema(
    formData: Array<{
      key: string;
      value: string;
      type?: string;
      disabled?: boolean;
    }>
  ): any {
    const properties: any = {};

    formData.forEach((field) => {
      if (!field.disabled) {
        properties[field.key] = {
          type: field.type === "file" ? "string" : "string",
          format: field.type === "file" ? "binary" : undefined,
        };
      }
    });

    return {
      type: "object",
      properties,
    };
  }

  private generateRequestSchema(
    parameters: APIParameter[],
    body?: APIEndpoint["body"]
  ): any {
    const schema: any = {
      type: "object",
      properties: {},
    };

    // Add parameters to schema
    parameters.forEach((param) => {
      schema.properties[param.name] = {
        type: param.type,
        description: param.description,
      };
    });

    // Add body schema if present
    if (body && body.schema) {
      schema.properties.body = body.schema;
    }

    return schema;
  }

  /**
   * Validate a Postman collection by checking for common issues
   */
  validateCollection(collection: PostmanCollection): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic structure
    if (!collection.info?.name) {
      errors.push("Collection must have a name");
    }

    if (!collection.item || collection.item.length === 0) {
      errors.push("Collection must contain at least one request or folder");
    }

    // Check for valid requests
    let hasValidRequest = false;
    const checkItems = (items: PostmanItem[]) => {
      items.forEach((item) => {
        if (item.request) {
          hasValidRequest = true;
          // Validate request structure
          if (!item.request.method) {
            warnings.push(`Request "${item.name}" is missing HTTP method`);
          }
          if (!item.request.url) {
            warnings.push(`Request "${item.name}" is missing URL`);
          }
        }
        if (item.item) {
          checkItems(item.item);
        }
      });
    };

    checkItems(collection.item);

    if (!hasValidRequest) {
      errors.push("Collection must contain at least one valid request");
    }

    // Check for base URL or variables
    const hasBaseUrl = collection.variable?.some(
      (v) =>
        v.key.toLowerCase().includes("baseurl") ||
        v.key.toLowerCase().includes("host") ||
        v.key.toLowerCase().includes("url")
    );

    if (!hasBaseUrl) {
      warnings.push(
        "Consider adding a base URL variable for easier configuration"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export default PostmanCollectionService;
