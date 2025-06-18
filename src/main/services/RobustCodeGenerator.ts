import * as fs from "fs/promises";
import * as path from "path";
import { APIServerConfig } from "../../shared/apiServerTypes";

interface CodeTemplate {
  serverConfig: string;
  tools: string;
  toolHandlers: string;
  makeApiCall: string;
}

export class RobustCodeGenerator {
  private getTemplate(): string {
    return `#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { createHash } from "crypto";

// Server configuration
const SERVER_CONFIG: any = __SERVER_CONFIG__;

interface RequestCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

class MCPAPIServer {
  private server: Server;
  private cache: RequestCache = {};

  constructor() {
    this.server = new Server(
      {
        name: SERVER_CONFIG.name,
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [__TOOLS__]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        __TOOL_HANDLERS__
        
        throw new Error(\`Unknown tool: \${name}\`);
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: \`Error executing tool \${name}: \${error.message}\`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private isValidCacheEntry(entry: any, ttl: number): boolean {
    return entry && (Date.now() - entry.timestamp) < ttl;
  }

  private generateCacheKey(method: string, url: string, params: any = {}): string {
    const paramsStr = JSON.stringify(params);
    return createHash('md5').update(\`\${method}:\${url}:\${paramsStr}\`).digest('hex');
  }

__MAKE_API_CALL__

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP API Server running on stdio");
  }
}

const server = new MCPAPIServer();
server.run().catch(console.error);`;
  }

  /**
   * Generate robust MCP server code using template replacement
   */
  async generateMCPServerCode(config: APIServerConfig): Promise<string> {
    try {
      // Get the embedded template
      const template = this.getTemplate();

      // Generate code components
      const codeComponents = this.generateCodeComponents(config);

      // Replace placeholders in template
      let generatedCode = template
        .replace("__SERVER_CONFIG__", codeComponents.serverConfig)
        .replace("__TOOLS__", codeComponents.tools)
        .replace("__TOOL_HANDLERS__", codeComponents.toolHandlers)
        .replace("__MAKE_API_CALL__", codeComponents.makeApiCall);

      return generatedCode;
    } catch (error) {
      console.error("Error generating MCP server code:", error);
      throw new Error(
        `Failed to generate server code: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private generateCodeComponents(config: APIServerConfig): CodeTemplate {
    return {
      serverConfig: this.generateServerConfig(config),
      tools: this.generateToolsArray(config),
      toolHandlers: this.generateToolHandlers(config),
      makeApiCall: this.generateMakeApiCallMethod(config),
    };
  }

  private generateServerConfig(config: APIServerConfig): string {
    const configObj = {
      id: config.id,
      name: config.name,
      description: config.description,
      baseUrl: config.baseUrl,
      authentication: config.authentication,
      endpoints: config.endpoints,
    };

    return JSON.stringify(configObj, null, 2);
  }

  private generateToolsArray(config: APIServerConfig): string {
    const tools = config.endpoints
      .filter((endpoint) => endpoint.enabled !== false)
      .map((endpoint) => {
        const toolName = this.sanitizeToolName(
          endpoint.toolName || endpoint.id
        );
        const description = this.escapeString(
          endpoint.description ||
            `${endpoint.method} request to ${endpoint.path}`
        );

        const parameters = endpoint.parameters || [];
        const properties: any = {};
        const required: string[] = [];

        parameters.forEach((param) => {
          const paramName = this.sanitizeParameterName(param.name);
          properties[paramName] = {
            type: param.type || "string",
            description: this.escapeString(param.description || ""),
          };

          if (param.required) {
            required.push(paramName);
          }
        });

        return {
          name: toolName,
          description: description,
          inputSchema: {
            type: "object",
            properties: properties,
            required: required,
          },
        };
      });

    return tools
      .map(
        (tool) =>
          "          " +
          JSON.stringify(tool, null, 2).replace(/\n/g, "\n          ")
      )
      .join(",\n");
  }

  private generateToolHandlers(config: APIServerConfig): string {
    const handlers = config.endpoints
      .filter((endpoint) => endpoint.enabled !== false)
      .map((endpoint) => {
        const toolName = this.sanitizeToolName(
          endpoint.toolName || endpoint.id
        );
        const endpointId = this.escapeString(endpoint.id);

        return `        if (name === "${toolName}") {
          const result = await this.makeAPICall("${endpointId}", args || {});
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }`;
      });

    return handlers.join("\n        else ");
  }

  private generateMakeApiCallMethod(config: APIServerConfig): string {
    const baseUrl = config.baseUrl || "";

    const methodBody = `
  private async makeAPICall(endpointId: string, params: any = {}): Promise<any> {
    const endpoint = SERVER_CONFIG.endpoints.find((ep: any) => ep.id === endpointId);
    if (!endpoint) {
      throw new Error("Endpoint " + endpointId + " not found");
    }

    // Build URL
    let url = "${baseUrl}" + endpoint.path;
    
    // Replace path parameters
    const pathParams = endpoint.parameters?.filter((p: any) => p.in === "path") || [];
    pathParams.forEach((param: any) => {
      const paramValue = params[param.name];
      if (paramValue !== undefined) {
        url = url.replace(":" + param.name, encodeURIComponent(String(paramValue)));
      }
    });

    // Add query parameters
    const queryParams = endpoint.parameters?.filter((p: any) => p.in === "query") || [];
    const searchParams = new URLSearchParams();
    queryParams.forEach((param: any) => {
      const paramValue = params[param.name];
      if (paramValue !== undefined) {
        searchParams.append(param.name, String(paramValue));
      }
    });
    
    if (searchParams.toString()) {
      url += "?" + searchParams.toString();
    }

    // Check cache
    if (endpoint.caching?.enabled) {
      const cacheKey = this.generateCacheKey(endpoint.method, url, params);
      const cached = this.cache[cacheKey];
      const ttl = endpoint.caching.ttl || 300000; // 5 minutes default
      
      if (this.isValidCacheEntry(cached, ttl)) {
        return cached.data;
      }
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "MCP-Server/1.0.0",
      ...endpoint.headers
    };

    // Add authentication
    if (SERVER_CONFIG.authentication) {
      const auth = SERVER_CONFIG.authentication;
      if (auth.type === "apikey" && auth.headerName && auth.credentials.apiKey) {
        headers[auth.headerName] = auth.credentials.apiKey;
      } else if (auth.type === "bearer" && auth.credentials.token) {
        headers["Authorization"] = "Bearer " + auth.credentials.token;
      }
    }

    // Prepare request options
    const requestOptions: any = {
      method: endpoint.method,
      headers: headers,
      timeout: endpoint.timeout || 30000
    };

    // Add body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(endpoint.method.toUpperCase())) {
      const bodyParams = endpoint.parameters?.filter((p: any) => p.in === "body") || [];
      if (bodyParams.length > 0) {
        const body: Record<string, any> = {};
        bodyParams.forEach((param: any) => {
          const paramValue = params[param.name];
          if (paramValue !== undefined) {
            body[param.name] = paramValue;
          }
        });
        requestOptions.body = JSON.stringify(body);
      }
    }

    // Make request with retries
    const maxRetries = endpoint.retries?.count || 3;
    const retryDelay = endpoint.retries?.delay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error("HTTP " + response.status + ": " + response.statusText);
        }
        
        const data = await response.json();
        
        // Cache successful response
        if (endpoint.caching?.enabled) {
          const cacheKey = this.generateCacheKey(endpoint.method, url, params);
          const ttl = endpoint.caching.ttl || 300000;
          this.cache[cacheKey] = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
          };
        }
        
        return data;
      } catch (error: any) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.error("Request failed (attempt " + attempt + "/" + maxRetries + "), retrying in " + retryDelay + "ms:", error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)));
      }
    }
  }`;

    return methodBody;
  }

  private sanitizeToolName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/^[^a-zA-Z_]/, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  private sanitizeParameterName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/^[^a-zA-Z_]/, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }
}
