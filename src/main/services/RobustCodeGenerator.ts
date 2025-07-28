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
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import https from "https";

// Custom HTTPS agent that ignores SSL certificate errors (for development)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // WARNING: Only use this for development/testing
});

// Server configuration
const SERVER_CONFIG: any = __SERVER_CONFIG__;

// OAuth2 Token Storage (for Electron/Node.js environment)
class OAuth2TokenManager {
  private tokenFile: string;

  constructor(serverId: string) {
    const dataDir = path.join(os.homedir(), '.mcp-client');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.tokenFile = path.join(dataDir, \`oauth2_token_\${serverId}.json\`);
  }

  getToken(): any {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const tokenData = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
        
        // Check if token is expired
        if (tokenData.expires_at && tokenData.expires_at > Date.now()) {
          return tokenData;
        } else {
          console.log('OAuth2 token expired');
          return null;
        }
      }
    } catch (error) {
      console.error('Error reading OAuth2 token:', error);
    }
    return null;
  }

  storeToken(tokenData: any): void {
    try {
      fs.writeFileSync(this.tokenFile, JSON.stringify(tokenData, null, 2));
    } catch (error) {
      console.error('Error storing OAuth2 token:', error);
    }
  }

  clearToken(): void {
    try {
      if (fs.existsSync(this.tokenFile)) {
        fs.unlinkSync(this.tokenFile);
      }
    } catch (error) {
      console.error('Error clearing OAuth2 token:', error);
    }
  }
}

// Initialize OAuth2 token manager if OAuth2 is configured
const oauth2Manager = SERVER_CONFIG.authentication?.type === 'oauth2' 
  ? new OAuth2TokenManager(SERVER_CONFIG.id) 
  : null;

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
      console.log("Generating MCP server code for:", config.name);

      // Validate config
      if (!config || !config.endpoints) {
        throw new Error("Invalid configuration: missing endpoints");
      }

      // Get the embedded template
      const template = this.getTemplate();

      // Generate code components
      console.log("Generating code components...");
      const codeComponents = this.generateCodeComponents(config);

      // Replace placeholders in template
      console.log("Replacing template placeholders...");
      let generatedCode = template
        .replace("__SERVER_CONFIG__", codeComponents.serverConfig)
        .replace("__TOOLS__", codeComponents.tools)
        .replace("__TOOL_HANDLERS__", codeComponents.toolHandlers)
        .replace("__MAKE_API_CALL__", codeComponents.makeApiCall);

      console.log("MCP server code generation completed successfully");
      return generatedCode;
    } catch (error) {
      console.error("Error generating MCP server code:", error);
      console.error("Config:", JSON.stringify(config, null, 2));
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
          // Ensure param and param.name exist
          if (!param || typeof param !== "object" || !param.name) {
            console.log("Skipping invalid parameter:", param);
            return; // Skip invalid parameters
          }

          const paramName = this.sanitizeParameterName(param.name);

          // Add better description fallback
          const description =
            param.description ||
            `${param.name} parameter for ${endpoint.method} ${endpoint.path}`;

          const paramSchema: any = {
            type: param.type || "string",
            description: this.escapeString(description),
          };

          // Add enum if available
          if (param.enum) {
            paramSchema.enum = param.enum;
          }

          // Add example if available
          if (param.example !== undefined) {
            paramSchema.example = param.example;
          }

          properties[paramName] = paramSchema;

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
    let url = SERVER_CONFIG.baseUrl + endpoint.path;
    
    // Replace path parameters (detect from URL pattern)
    const pathParamMatches = endpoint.path.match(/\\{([^}]+)\\}/g) || [];
    const pathParamNames = pathParamMatches.map((match: string) => match.slice(1, -1)); // Remove { }
    
    pathParamNames.forEach((paramName: string) => {
      const paramValue = params[paramName];
      if (paramValue !== undefined) {
        url = url.replace(\`{\${paramName}}\`, encodeURIComponent(String(paramValue)));
      }
    });

    // Add query parameters (exclude path parameters)
    const pathParamNamesSet = new Set(pathParamNames);
    const queryParams = endpoint.parameters?.filter((p: any) => 
      p && p.name && (p.in === "query" || (endpoint.method === "GET" && !p.in && !pathParamNamesSet.has(p.name)))
    ) || [];
    const searchParams = new URLSearchParams();
    queryParams.forEach((param: any) => {
      if (!param || !param.name) return; // Skip invalid parameters
      
      const paramValue = params[param.name];
      if (paramValue !== undefined) {
        if (Array.isArray(paramValue)) {
          // Handle array parameters
          paramValue.forEach((value) => {
            searchParams.append(param.name, String(value));
          });
        } else {
          searchParams.append(param.name, String(paramValue));
        }
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
      if (auth.type === "apikey" && auth.headerName && auth.credentials.apikey) {
        headers[auth.headerName] = auth.credentials.apikey;
      } else if (auth.type === "bearer" && auth.credentials.token) {
        headers["Authorization"] = "Bearer " + auth.credentials.token;
      } else if (auth.type === "oauth2") {
        // Try to get OAuth2 token from multiple sources
        let accessToken = null;
        
        // 1. From server config (if available)
        if (auth.oauth2?.accessToken) {
          accessToken = auth.oauth2.accessToken;
        }
        
        // 2. From OAuth2 token manager (file storage)
        if (!accessToken && oauth2Manager) {
          const tokenData = oauth2Manager.getToken();
          if (tokenData?.access_token) {
            accessToken = tokenData.access_token;
          }
        }
        
        // 3. Throw error if no token available
        if (!accessToken) {
          throw new Error("OAuth2 authentication required. Please authenticate via the MCP client.");
        }
        
        headers["Authorization"] = "Bearer " + accessToken;
      }
    }

    // Prepare request options
    const requestOptions: any = {
      method: endpoint.method,
      headers: headers,
      timeout: endpoint.timeout || 30000,
      // Add HTTPS agent to ignore SSL certificate errors for development
      agent: url.startsWith('https:') ? httpsAgent : undefined
    };

    // Add body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(endpoint.method.toUpperCase())) {
      // For POST/PUT/PATCH, treat all parameters as body parameters (except path and query)
      const queryParams = endpoint.parameters?.filter((p: any) => p && p.name && p.in === "query") || [];
      const queryParamNames = new Set(queryParams.map((p: any) => p.name).filter(name => name));
      
      const bodyParams = endpoint.parameters?.filter((p: any) => 
        p && p.name && !pathParamNamesSet.has(p.name) && !queryParamNames.has(p.name)
      ) || [];
      
      if (bodyParams.length > 0) {
        const body: Record<string, any> = {};
        bodyParams.forEach((param: any) => {
          if (!param || !param.name) return; // Skip invalid parameters
          
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
    if (!name || typeof name !== "string") {
      return "unnamed_tool";
    }
    return name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/^[^a-zA-Z_]/, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  private sanitizeParameterName(name: string): string {
    if (!name || typeof name !== "string") {
      return "unnamed_param";
    }
    return name
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/^[^a-zA-Z_]/, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  private escapeString(str: string): string {
    if (!str || typeof str !== "string") {
      return "";
    }
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }
}
