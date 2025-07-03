import { PublicAPISpec, PublicAPIEndpoint } from "../../shared/publicApiTypes";
import { APIServerConfig } from "../../shared/apiServerTypes";

interface PrivateAPIConfig {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  environment: "production" | "staging" | "development" | "sandbox";
  accessLevel: "private" | "internal" | "partner";
  authConfig?: {
    type: string;
    config: Record<string, any>;
  };
  customHeaders?: Record<string, string>;
  vpnRequired?: boolean;
  sslConfig?: {
    verify: boolean;
    selfSigned?: boolean;
    customCa?: string;
  };
}

class PrivateAPIService {
  private static instance: PrivateAPIService;
  private privateAPIs: Map<string, PrivateAPIConfig> = new Map();
  private readonly STORAGE_KEY = "mcp_studio_private_apis";

  public static getInstance(): PrivateAPIService {
    if (!PrivateAPIService.instance) {
      PrivateAPIService.instance = new PrivateAPIService();
    }
    return PrivateAPIService.instance;
  }

  private constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const configs = JSON.parse(stored);
        configs.forEach((config: PrivateAPIConfig) => {
          this.privateAPIs.set(config.id, config);
        });
      }
    } catch (error) {
      console.error("Failed to load private APIs from storage:", error);
    }
  }

  private saveToStorage(): void {
    try {
      const configs = Array.from(this.privateAPIs.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error("Failed to save private APIs to storage:", error);
    }
  }

  async addPrivateAPI(config: PrivateAPIConfig): Promise<void> {
    // Validate the API is accessible
    await this.validateAPIAccess(config);

    this.privateAPIs.set(config.id, config);
    this.saveToStorage();
  }

  async validateAPIAccess(config: PrivateAPIConfig): Promise<boolean> {
    try {
      const testUrl = `${config.baseUrl.replace(/\/$/, "")}/health`;

      // Check if we're in Electron environment for CORS bypass
      const isElectron =
        typeof window !== "undefined" && (window as any).electronAPI;

      if (isElectron) {
        const response = await (window as any).electronAPI.testPrivateApi({
          url: testUrl,
          method: "GET",
          headers: {
            ...config.customHeaders,
            "User-Agent": "MCP-Studio-Private-API-Validator/1.0.0",
          },
          sslConfig: config.sslConfig,
        });

        return response.status < 500; // Accept any non-server error
      } else {
        // Fallback for web environment
        const response = await fetch(testUrl, {
          method: "GET",
          headers: config.customHeaders || {},
        });

        return response.status < 500;
      }
    } catch (error) {
      console.warn("Private API validation failed:", error);
      return false; // Don't block adding, just warn
    }
  }

  async discoverEndpoints(
    apiId: string,
    openApiUrl?: string
  ): Promise<PublicAPIEndpoint[]> {
    const config = this.privateAPIs.get(apiId);
    if (!config) {
      throw new Error("Private API not found");
    }

    const specUrl = openApiUrl || `${config.baseUrl}/openapi.json`;

    try {
      const isElectron =
        typeof window !== "undefined" && (window as any).electronAPI;

      let response: any;
      if (isElectron) {
        response = await (window as any).electronAPI.testPrivateApi({
          url: specUrl,
          method: "GET",
          headers: {
            Accept: "application/json",
            ...config.customHeaders,
          },
          sslConfig: config.sslConfig,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`);
        }

        const spec = JSON.parse(response.data);
        return this.parseOpenAPISpec(spec);
      } else {
        const fetchResponse = await fetch(specUrl, {
          headers: {
            Accept: "application/json",
            ...config.customHeaders,
          },
        });

        if (!fetchResponse.ok) {
          throw new Error(
            `Failed to fetch OpenAPI spec: ${fetchResponse.status}`
          );
        }

        const spec = await fetchResponse.json();
        return this.parseOpenAPISpec(spec);
      }
    } catch (error) {
      console.error("Failed to discover endpoints:", error);
      return this.generateFallbackEndpoints();
    }
  }

  private parseOpenAPISpec(spec: any): PublicAPIEndpoint[] {
    const endpoints: PublicAPIEndpoint[] = [];
    const paths = spec.paths || {};

    Object.entries(paths).forEach(([path, pathData]: [string, any]) => {
      Object.entries(pathData).forEach(([method, operation]: [string, any]) => {
        if (
          ["get", "post", "put", "delete", "patch"].includes(
            method.toLowerCase()
          )
        ) {
          endpoints.push({
            id: `${method}-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path,
            method: method.toUpperCase() as any,
            summary: operation.summary || `${method.toUpperCase()} ${path}`,
            description: operation.description || "",
            parameters:
              operation.parameters?.map((p: any) => ({
                name: p.name,
                in: p.in,
                required: p.required || false,
                type: p.schema?.type || p.type || "string",
                description: p.description || "",
              })) || [],
            responses: operation.responses || {},
            tags: operation.tags || [],
          });
        }
      });
    });

    return endpoints;
  }

  private generateFallbackEndpoints(): PublicAPIEndpoint[] {
    return [
      {
        id: "health-check",
        path: "/health",
        method: "GET",
        summary: "Health Check",
        description: "Check API health status",
        responses: { "200": { description: "OK" } },
      },
      {
        id: "api-info",
        path: "/info",
        method: "GET",
        summary: "API Information",
        description: "Get API version and information",
        responses: { "200": { description: "API Info" } },
      },
    ];
  }

  convertToPublicAPISpec(config: PrivateAPIConfig): PublicAPISpec {
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      version: "1.0.0",
      category: "Private",
      baseUrl: config.baseUrl,
      provider: "Private/Internal",
      tags: ["private", config.environment, config.accessLevel],
      authentication: {
        type: (config.authConfig?.type as any) || "none",
        description: "Private API authentication",
      },
      pricing: "private" as any,
      status: "private",
      lastUpdated: new Date().toISOString(),
      isPrivate: true,
      accessLevel: config.accessLevel,
      environment: config.environment,
      customFields: {
        vpnRequired: config.vpnRequired,
        sslConfig: config.sslConfig,
        customHeaders: config.customHeaders,
      },
    };
  }

  getAllPrivateAPIs(): PrivateAPIConfig[] {
    return Array.from(this.privateAPIs.values());
  }

  getPrivateAPI(id: string): PrivateAPIConfig | undefined {
    return this.privateAPIs.get(id);
  }

  removePrivateAPI(id: string): void {
    this.privateAPIs.delete(id);
    this.saveToStorage();
  }

  async testConnection(id: string): Promise<{
    success: boolean;
    responseTime: number;
    status?: number;
    error?: string;
  }> {
    const config = this.privateAPIs.get(id);
    if (!config) {
      throw new Error("Private API not found");
    }

    const startTime = Date.now();

    try {
      const success = await this.validateAPIAccess(config);
      const responseTime = Date.now() - startTime;

      return {
        success,
        responseTime,
        status: success ? 200 : 500,
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Export configuration for backup/sharing
  exportConfiguration(): string {
    const configs = Array.from(this.privateAPIs.values());
    return JSON.stringify(configs, null, 2);
  }

  // Import configuration from backup/sharing
  async importConfiguration(configJson: string): Promise<void> {
    try {
      const configs: PrivateAPIConfig[] = JSON.parse(configJson);

      for (const config of configs) {
        await this.addPrivateAPI(config);
      }
    } catch (error) {
      throw new Error(
        `Failed to import configuration: ${
          error instanceof Error ? error.message : "Invalid JSON"
        }`
      );
    }
  }
}

export default PrivateAPIService.getInstance();
export type { PrivateAPIConfig };
