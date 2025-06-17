import { ipcMain } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { APIServerConfig, APIServerStatus } from "../../shared/apiServerTypes";
import { MCPManager } from "../mcp/MCPManager";

class APIServerService {
  private apiServers: Map<string, APIServerConfig> = new Map();
  private runningServers: Map<
    string,
    { process: ChildProcess; status: APIServerStatus }
  > = new Map();
  private configPath: string;
  private mcpManager: MCPManager | null = null;

  constructor(mcpManager?: MCPManager) {
    this.configPath = path.join(process.cwd(), "api-servers.json");
    this.mcpManager = mcpManager || null;
    this.setupIpcHandlers();
    this.setupDocumentationHandler();
    this.loadSavedServers();
  }

  private setupIpcHandlers() {
    // Get all API servers
    ipcMain.handle("api-server:get-all", async () => {
      return Array.from(this.apiServers.values());
    });

    // Save API server
    ipcMain.handle("api-server:save", async (_, config: APIServerConfig) => {
      return this.saveServer(config);
    });

    // Delete API server
    ipcMain.handle("api-server:delete", async (_, serverId: string) => {
      return this.deleteServer(serverId);
    });

    // Start API server
    ipcMain.handle("api-server:start", async (_, serverId: string) => {
      return this.startServer(serverId);
    });

    // Stop API server
    ipcMain.handle("api-server:stop", async (_, serverId: string) => {
      return this.stopServer(serverId);
    });

    // Get API server status
    ipcMain.handle("api-server:get-status", async (_, serverId: string) => {
      return this.getServerStatus(serverId);
    });

    // Test API endpoint
    ipcMain.handle(
      "api-server:test-endpoint",
      async (
        _,
        serverId: string,
        endpointId: string,
        params?: Record<string, any>
      ) => {
        return this.testEndpoint(serverId, endpointId, params);
      }
    );
  }

  // Add IPC handler for documentation generation
  private setupDocumentationHandler() {
    ipcMain.handle("api-server:generate-docs", async (_, serverId: string) => {
      return this.generateDocumentation(serverId);
    });
  }

  private async loadSavedServers() {
    try {
      const data = await fs.readFile(this.configPath, "utf-8");
      const servers: APIServerConfig[] = JSON.parse(data);

      for (const server of servers) {
        this.apiServers.set(server.id, server);
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty list
      console.log("No saved API servers found, starting fresh");
    }
  }

  private async saveServersToFile() {
    try {
      const servers = Array.from(this.apiServers.values());
      await fs.writeFile(this.configPath, JSON.stringify(servers, null, 2));
    } catch (error) {
      console.error("Failed to save API servers:", error);
      throw error;
    }
  }

  private async saveServer(config: APIServerConfig): Promise<APIServerConfig> {
    // Validate required fields
    if (!config.name || !config.baseUrl) {
      throw new Error("Name and base URL are required");
    }

    // Ensure dates are proper Date objects
    config.created = config.created ? new Date(config.created) : new Date();
    config.updated = new Date();

    // Store the server
    this.apiServers.set(config.id, config);

    // Save to file
    await this.saveServersToFile();

    // Generate MCP server files
    await this.generateMCPServer(config);

    return config;
  }

  private async deleteServer(serverId: string): Promise<boolean> {
    if (!this.apiServers.has(serverId)) {
      throw new Error("Server not found");
    }

    // Stop the server if running
    await this.stopServer(serverId);

    // Remove from memory
    this.apiServers.delete(serverId);

    // Save to file
    await this.saveServersToFile();

    // Clean up generated files
    await this.cleanupServerFiles(serverId);

    return true;
  }

  private async startServer(serverId: string): Promise<APIServerStatus> {
    const server = this.apiServers.get(serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Check if already running
    if (this.runningServers.has(serverId)) {
      return this.runningServers.get(serverId)!.status;
    }

    // Generate server files if they don't exist
    const serverDir = path.join(process.cwd(), "generated-servers", serverId);
    const serverPath = path.join(serverDir, "server.js");

    try {
      await fs.access(serverPath);
    } catch {
      // Files don't exist, generate them
      await this.generateMCPServer(server);
      await this.buildServer(serverId);
    }

    // Start the server process
    const serverProcess = spawn("node", [serverPath], {
      cwd: serverDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const status: APIServerStatus = {
      id: serverId,
      status: "running",
      connected: true, // Set connected field
      pid: serverProcess.pid,
      startTime: new Date(),
      toolsAvailable: server.endpoints.filter((e) => e.enabled).length,
      lastHealth: new Date(),
    };

    // Store the running server
    this.runningServers.set(serverId, { process: serverProcess, status });

    // Handle process events
    serverProcess.on("exit", (code) => {
      console.log(`Server ${serverId} exited with code ${code}`);
      this.runningServers.delete(serverId);
      // Remove from MCP Manager when the server stops
      this.removeFromMCPManager(serverId);
    });

    serverProcess.on("error", (error) => {
      console.error(`Server ${serverId} error:`, error);
      this.runningServers.delete(serverId);
      // Remove from MCP Manager on error
      this.removeFromMCPManager(serverId);
    });

    console.log(
      `Started API server: ${server.name} (PID: ${serverProcess.pid})`
    );

    // Register with MCP Manager if available
    await this.registerWithMCPManager(serverId, server);

    return status;
  }

  private async stopServer(serverId: string): Promise<boolean> {
    const serverInfo = this.runningServers.get(serverId);
    if (!serverInfo) {
      // Server is not running, but try to remove from MCP Manager anyway
      await this.removeFromMCPManager(serverId);
      return true;
    }

    const { process: serverProcess } = serverInfo;

    return new Promise((resolve) => {
      serverProcess.on("exit", () => {
        this.runningServers.delete(serverId);
        resolve(true);
      });

      // Try graceful shutdown first
      serverProcess.kill("SIGTERM");

      // Force kill after timeout
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill("SIGKILL");
          this.runningServers.delete(serverId);
          resolve(true);
        }
      }, 5000);
    });
  }

  private async getServerStatus(
    serverId: string
  ): Promise<APIServerStatus | null> {
    const server = this.apiServers.get(serverId);
    if (!server) {
      return null;
    }

    const runningServer = this.runningServers.get(serverId);
    if (runningServer) {
      // Update last health check
      runningServer.status.lastHealth = new Date();
      runningServer.status.connected = true; // Set connected field
      return runningServer.status;
    }

    // Server is not running
    return {
      id: serverId,
      status: "stopped",
      connected: false, // Set connected field
      toolsAvailable: server.endpoints.filter((e) => e.enabled).length,
    };
  }

  private async testEndpoint(
    serverId: string,
    endpointId: string,
    params?: Record<string, any>
  ): Promise<any> {
    const server = this.apiServers.get(serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    const endpoint = server.endpoints.find((e) => e.id === endpointId);
    if (!endpoint) {
      throw new Error("Endpoint not found");
    }

    try {
      // Build the URL
      const url = new URL(endpoint.path, server.baseUrl);

      // Add query parameters for GET requests
      if (endpoint.method === "GET" && params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...server.globalHeaders,
      };

      // Add authentication
      if (
        server.authentication.type === "bearer" &&
        server.authentication.credentials?.token
      ) {
        headers.Authorization = `Bearer ${server.authentication.credentials.token}`;
      } else if (
        server.authentication.type === "apikey" &&
        server.authentication.credentials?.apikey
      ) {
        const headerName = server.authentication.headerName || "X-API-Key";
        headers[headerName] = server.authentication.credentials.apikey;
      } else if (
        server.authentication.type === "basic" &&
        server.authentication.credentials?.username &&
        server.authentication.credentials?.password
      ) {
        const encoded = Buffer.from(
          `${server.authentication.credentials.username}:${server.authentication.credentials.password}`
        ).toString("base64");
        headers.Authorization = `Basic ${encoded}`;
      }

      // Build request options
      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers,
      };

      // Add body for non-GET requests
      if (endpoint.method !== "GET" && params) {
        requestOptions.body = JSON.stringify(params);
      }

      const startTime = Date.now();
      const response = await fetch(url.toString(), requestOptions);
      const endTime = Date.now();

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        responseTime: endTime - startTime,
        url: url.toString(),
      };
    } catch (error) {
      throw new Error(
        `Test failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async generateMCPServer(config: APIServerConfig): Promise<void> {
    // Generate the MCP server TypeScript file
    const serverCode = this.generateServerCode(config);

    // Create directory if it doesn't exist
    const serverDir = path.join(process.cwd(), "generated-servers", config.id);
    await fs.mkdir(serverDir, { recursive: true });

    // Write server file
    const serverPath = path.join(serverDir, "server.ts");
    await fs.writeFile(serverPath, serverCode);

    // Write package.json
    const packageJson = {
      name: `mcp-api-server-${config.id}`,
      version: "1.0.0",
      description: config.description,
      main: "server.js",
      scripts: {
        build: "tsc server.ts",
        start: "node server.js",
      },
      dependencies: {
        "@modelcontextprotocol/sdk": "^0.5.0",
        "node-fetch": "^3.0.0",
      },
      devDependencies: {
        "@types/node": "^18.0.0",
        typescript: "^5.0.0",
      },
    };

    await fs.writeFile(
      path.join(serverDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    console.log(`Generated MCP server for ${config.name} at ${serverPath}`);
  }

  private async buildServer(serverId: string): Promise<void> {
    const serverDir = path.join(process.cwd(), "generated-servers", serverId);
    const serverPath = path.join(serverDir, "server.ts");

    try {
      // Check if TypeScript is installed
      const { spawn } = require("child_process");

      return new Promise((resolve, reject) => {
        const buildProcess = spawn("npx", ["tsc", "server.ts"], {
          cwd: serverDir,
          stdio: ["pipe", "pipe", "pipe"],
        });

        buildProcess.on("exit", (code: number | null) => {
          if (code === 0) {
            console.log(`Built MCP server for ${serverId}`);
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });

        buildProcess.on("error", (error: Error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error(`Failed to build server ${serverId}:`, error);
      throw error;
    }
  }

  private generateServerCode(config: APIServerConfig): string {
    const tools = config.endpoints
      .filter((endpoint) => endpoint.enabled)
      .map((endpoint) => this.generateToolDefinition(endpoint, config))
      .join(",\n");

    const toolHandlers = config.endpoints
      .filter((endpoint) => endpoint.enabled)
      .map((endpoint) => this.generateToolHandler(endpoint, config))
      .join("\n");

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
const SERVER_CONFIG = ${JSON.stringify(config, null, 2)};

// In-memory cache
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, data: any, ttl = 300000): void {
    if (!SERVER_CONFIG.caching?.enabled) return;
    
    // Clean old entries if at max size
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    if (!SERVER_CONFIG.caching?.enabled) return null;
    
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  generateKey(endpoint: any, params: any): string {
    const keyData = {
      path: endpoint.path,
      method: endpoint.method,
      params: params || {},
      baseUrl: SERVER_CONFIG.baseUrl
    };
    return createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const now = Date.now();
    const validEntries = Array.from(this.cache.values()).filter(
      entry => now - entry.timestamp <= entry.ttl
    );
    
    return {
      size: validEntries.length,
      maxSize: this.maxSize,
      hitRate: this.cache.size > 0 ? validEntries.length / this.cache.size : 0
    };
  }
}

// Metrics collector
class MetricsCollector {
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    endpointMetrics: new Map<string, { requests: number; totalTime: number; errors: number }>()
  };

  recordRequest(endpoint: string, responseTime: number, success: boolean): void {
    if (!SERVER_CONFIG.monitoring?.metrics?.enabled) return;

    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += responseTime;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    const endpointKey = \`\${endpoint.method} \${endpoint.path}\`;
    const endpointMetric = this.metrics.endpointMetrics.get(endpointKey) || {
      requests: 0,
      totalTime: 0,
      errors: 0
    };

    endpointMetric.requests++;
    endpointMetric.totalTime += responseTime;
    if (!success) endpointMetric.errors++;

    this.metrics.endpointMetrics.set(endpointKey, endpointMetric);
  }

  getMetrics() {
    const avgResponseTime = this.metrics.totalRequests > 0 
      ? this.metrics.totalResponseTime / this.metrics.totalRequests 
      : 0;

    const errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;

    return {
      ...this.metrics,
      avgResponseTime,
      errorRate,
      endpointMetrics: Object.fromEntries(this.metrics.endpointMetrics)
    };
  }
}

// Logger
class Logger {
  private logLevel: string;
  private logRequests: boolean;
  private logResponses: boolean;
  private logErrors: boolean;

  constructor() {
    const config = SERVER_CONFIG.logging || {};
    this.logLevel = config.level || 'info';
    this.logRequests = config.requests || false;
    this.logResponses = config.responses || false;
    this.logErrors = config.errors !== false; // Default to true
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private log(level: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    console.error(JSON.stringify(logEntry));
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    if (this.logErrors) {
      this.log('error', message, data);
    }
  }

  request(endpoint: any, params: any): void {
    if (this.logRequests) {
      this.info('API Request', { endpoint: \`\${endpoint.method} \${endpoint.path}\`, params });
    }
  }

  response(endpoint: any, responseTime: number, success: boolean, data?: any): void {
    if (this.logResponses) {
      this.info('API Response', { 
        endpoint: \`\${endpoint.method} \${endpoint.path}\`, 
        responseTime, 
        success,
        ...(data && { data })
      });
    }
  }
}

// Rate limiter
class RateLimiter {
  private requests = new Map<string, number[]>();

  isAllowed(endpoint: any): boolean {
    const rateLimit = endpoint.rateLimit || SERVER_CONFIG.rateLimit;
    if (!rateLimit) return true;

    const key = \`\${endpoint.method}:\${endpoint.path}\`;
    const now = Date.now();
    const windowStart = now - rateLimit.windowMs;

    // Get existing requests for this endpoint
    const endpointRequests = this.requests.get(key) || [];
    
    // Filter out old requests outside the window
    const recentRequests = endpointRequests.filter(time => time > windowStart);
    
    // Check if we're under the limit
    if (recentRequests.length >= rateLimit.requests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }
}

class APIServerMCP {
  private server: Server;
  private cache: SimpleCache;
  private metrics: MetricsCollector;
  private logger: Logger;
  private rateLimiter: RateLimiter;
  private startTime: number;

  constructor() {
    this.server = new Server(
      {
        name: "${config.name}",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.cache = new SimpleCache(SERVER_CONFIG.caching?.maxSize || 1000);
    this.metrics = new MetricsCollector();
    this.logger = new Logger();
    this.rateLimiter = new RateLimiter();
    this.startTime = Date.now();

    this.setupToolHandlers();
    this.setupHealthMonitoring();

    this.logger.info('API Server MCP initialized', { 
      name: SERVER_CONFIG.name,
      endpoints: SERVER_CONFIG.endpoints.length,
      cachingEnabled: SERVER_CONFIG.caching?.enabled || false,
      monitoringEnabled: SERVER_CONFIG.monitoring?.enabled || false
    });
  }

  private setupHealthMonitoring(): void {
    if (!SERVER_CONFIG.monitoring?.enabled) return;

    const interval = (SERVER_CONFIG.monitoring.healthCheck?.interval || 30) * 1000;
    
    setInterval(async () => {
      try {
        const healthEndpoint = SERVER_CONFIG.monitoring?.healthCheck?.endpoint || '/health';
        if (SERVER_CONFIG.baseUrl) {
          const healthUrl = new URL(healthEndpoint, SERVER_CONFIG.baseUrl);
          const response = await fetch(healthUrl.toString(), { 
            method: 'GET',
            timeout: 5000 
          });
          
          if (response.ok) {
            this.logger.debug('Health check passed', { url: healthUrl.toString() });
          } else {
            this.logger.warn('Health check failed', { 
              url: healthUrl.toString(), 
              status: response.status 
            });
          }
        }
      } catch (error) {
        this.logger.error('Health check error', { error: error.message });
      }
    }, interval);
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
${tools}
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
${toolHandlers}
          default:
            throw new Error(\`Unknown tool:
        }
      } catch (error) {
        this.logger.error('Tool execution error', { tool: name, error: error.message });
        return {
          content: [
            {
              type: "text",
              text: \`Error: \${error instanceof Error ? error.message : "Unknown error"}\`,
            },
        };
      }
    });
  }

  private async makeAPICall(endpoint: any, params: any = {}) {
    const startTime = Date.now();
    let success = false;
    let result = null;

    try {
      // Check rate limiting
      if (!this.rateLimiter.isAllowed(endpoint)) {
        throw new Error('Rate limit exceeded');
      }

      // Log request
      this.logger.request(endpoint, params);

      // Check cache first
      const cacheKey = this.cache.generateKey(endpoint, params);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        this.logger.debug('Cache hit', { endpoint: \`\${endpoint.method} \${endpoint.path}\` });
        return cachedResult;
      }

      const url = new URL(endpoint.path, SERVER_CONFIG.baseUrl);
      
      // Add query parameters for GET requests
      if (endpoint.method === "GET" && params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...SERVER_CONFIG.globalHeaders,
      };

      // Add authentication
      const auth = SERVER_CONFIG.authentication as any;
      if (auth.type === "bearer" && auth.credentials?.token) {
        headers.Authorization = \`Bearer \${auth.credentials.token}\`;
      } else if (auth.type === "apikey" && auth.credentials?.apikey) {
        const headerName = auth.headerName || "X-API-Key";
        headers[headerName] = auth.credentials.apikey;
      } else if (auth.type === "basic" && auth.credentials?.username && auth.credentials?.password) {
        const encoded = Buffer.from(\`\${auth.credentials.username}:\${auth.credentials.password}\`).toString("base64");
        headers.Authorization = \`Basic \${encoded}\`;
      }

      // Build request options with retry logic
      const timeout = endpoint.timeout || SERVER_CONFIG.timeout || 30000;
      const maxRetries = endpoint.retries?.count || SERVER_CONFIG.retries || 3;
      
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const requestOptions: any = {
            method: endpoint.method,
            headers,
            timeout,
          };

          // Add body for non-GET requests
          if (endpoint.method !== "GET" && params && Object.keys(params).length > 0) {
            requestOptions.body = JSON.stringify(params);
          }

          const response = await fetch(url.toString(), requestOptions);
          
          if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
          }

          const contentType = response.headers.get("content-type");
          let data;
          if (contentType && contentType.includes("application/json")) {
            data = await response.json();
          } else {
            data = await response.text();
          }

          result = {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data,
          };

          // Cache successful responses
          if (endpoint.caching?.enabled || SERVER_CONFIG.caching?.enabled) {
            const ttl = (endpoint.caching?.ttl || SERVER_CONFIG.caching?.defaultTtl || 300) * 1000;
            this.cache.set(cacheKey, result, ttl);
          }

          success = true;
          break;

        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            const delay = endpoint.retries?.delay || 1000;
            const backoff = endpoint.retries?.backoff || 'linear';
            const waitTime = backoff === 'exponential' ? delay * Math.pow(2, attempt) : delay;
            
            this.logger.warn(\`Request failed, retrying in \${waitTime}ms\`, { 
              attempt: attempt + 1, 
              maxRetries,
              error: error.message 
            });
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      if (!success && lastError) {
        throw lastError;
      }

      return result;

    } catch (error) {
      this.logger.error('API call failed', { 
        endpoint: \`\${endpoint.method} \${endpoint.path}\`,
        error: error.message 
      });
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      this.metrics.recordRequest(endpoint, responseTime, success);
      
      if (result) {
        this.logger.response(endpoint, responseTime, success, result);
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info("${
      config.name
    } MCP server running on stdio", { uptime: Date.now() - this.startTime });
  }
}

const server = new APIServerMCP();
server.run().catch(console.error);
`;
  }

  private generateToolDefinition(
    endpoint: any,
    config: APIServerConfig
  ): string {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    endpoint.parameters.forEach((param: any) => {
      properties[param.name] = {
        type: param.type,
        description: param.description || `${param.name} parameter`,
      };

      if (param.required) {
        required.push(param.name);
      }
    });

    return `          {
            name: "${endpoint.toolName}",
            description: "${endpoint.description}",
            inputSchema: {
              type: "object",
              properties: ${JSON.stringify(properties, null, 14)},
              required: ${JSON.stringify(required)},
            },
          }`;
  }

  private generateToolHandler(endpoint: any, config: APIServerConfig): string {
    return `          case "${endpoint.toolName}":
            // Validate required parameters
            const requiredParams = ${JSON.stringify(
              endpoint.parameters
                .filter((p: any) => p.required)
                .map((p: any) => p.name)
            )};
            for (const param of requiredParams) {
              if (args[param] === undefined || args[param] === null || args[param] === '') {
                throw new Error(\`Required parameter '\${param}' is missing\`);
              }
            }

            // Validate parameter types and formats
            ${endpoint.parameters
              .map((param: any) => {
                const validations = [];

                if (param.validation?.min !== undefined) {
                  validations.push(`if (typeof args['${param.name}'] === 'number' && args['${param.name}'] < ${param.validation.min}) {
                  throw new Error(\`Parameter '${param.name}' must be at least ${param.validation.min}\`);
                }`);
                }

                if (param.validation?.max !== undefined) {
                  validations.push(`if (typeof args['${param.name}'] === 'number' && args['${param.name}'] > ${param.validation.max}) {
                  throw new Error(\`Parameter '${param.name}' must be at most ${param.validation.max}\`);
                }`);
                }

                if (param.validation?.pattern) {
                  validations.push(`if (args['${param.name}'] && typeof args['${param.name}'] === 'string' && !/${param.validation.pattern}/.test(args['${param.name}'])) {
                  throw new Error(\`Parameter '${param.name}' format is invalid\`);
                }`);
                }

                if (param.enum && param.enum.length > 0) {
                  validations.push(`if (args['${
                    param.name
                  }'] && !${JSON.stringify(param.enum)}.includes(args['${
                    param.name
                  }'])) {
                  throw new Error(\`Parameter '${
                    param.name
                  }' must be one of: ${param.enum.join(", ")}\`);
                }`);
                }

                return validations.join("\n            ");
              })
              .join("\n            ")}

            const result_${
              endpoint.toolName
            } = await this.makeAPICall(${JSON.stringify(endpoint)}, args);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result_${endpoint.toolName}, null, 2),
                },
              ],
            };`;
  }

  private async cleanupServerFiles(serverId: string): Promise<void> {
    try {
      const serverDir = path.join(process.cwd(), "generated-servers", serverId);
      await fs.rm(serverDir, { recursive: true, force: true });
      console.log(`Cleaned up server files for ${serverId}`);
    } catch (error) {
      console.error(`Failed to cleanup server files for ${serverId}:`, error);
    }
  }

  // MCP Manager integration methods
  private async registerWithMCPManager(
    serverId: string,
    server: APIServerConfig
  ): Promise<void> {
    if (!this.mcpManager) {
      console.log("MCP Manager not available, skipping registration");
      return;
    }

    try {
      const serverDir = path.join(process.cwd(), "generated-servers", serverId);
      const serverPath = path.join(serverDir, "server.js");

      // Create MCP server configuration
      const mcpConfig = {
        id: serverId, // Use the original serverId directly since it's already unique
        name: `${server.name} (API Server)`,
        type: "stdio" as const,
        command: "node",
        args: [serverPath],
        env: {},
        cwd: serverDir,
      };

      // Add server to MCP Manager
      await this.mcpManager.addServer(mcpConfig);
      console.log(`Registered API server ${serverId} with MCP Manager`);

      // Connect the server
      await this.mcpManager.connectServer(mcpConfig.id);
      console.log(`Connected API server ${serverId} to MCP Manager`);
    } catch (error) {
      console.error(
        `Failed to register API server ${serverId} with MCP Manager:`,
        error
      );
    }
  }

  private async removeFromMCPManager(serverId: string): Promise<void> {
    if (!this.mcpManager) {
      return;
    }

    try {
      await this.mcpManager.removeServer(serverId); // Use serverId directly
      console.log(`Removed API server ${serverId} from MCP Manager`);
    } catch (error) {
      console.error(
        `Failed to remove API server ${serverId} from MCP Manager:`,
        error
      );
    }
  }

  // Cleanup method to stop all running servers
  public async cleanup(): Promise<void> {
    console.log("Stopping all running API servers...");

    const stopPromises = Array.from(this.runningServers.keys()).map(
      (serverId) => this.stopServer(serverId)
    );

    await Promise.all(stopPromises);
    console.log("All API servers stopped");
  }

  // Generate API documentation
  private async generateDocumentation(serverId: string): Promise<string> {
    const server = this.apiServers.get(serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    const doc = `# ${server.name} API Documentation

Generated on: ${new Date().toISOString()}

## Overview
${server.description || "No description provided"}

**Base URL:** ${server.baseUrl}

## Authentication
**Type:** ${server.authentication.type}
${
  server.authentication.type === "apikey"
    ? `**Header:** ${server.authentication.headerName || "X-API-Key"}`
    : ""
}
${
  server.authentication.type === "bearer"
    ? "**Header:** Authorization: Bearer <token>"
    : ""
}

## Global Headers
${Object.entries(server.globalHeaders || {})
  .map(([key, value]) => `- **${key}:** ${value}`)
  .join("\n")}

## Configuration
- **Timeout:** ${server.timeout || 30000}ms
- **Retries:** ${server.retries || 3}
${
  server.caching?.enabled
    ? `- **Caching:** Enabled (TTL: ${
        server.caching.defaultTtl || 300
      }s, Max Size: ${server.caching.maxSize || 1000}MB)`
    : "- **Caching:** Disabled"
}
${
  server.monitoring?.enabled
    ? `- **Monitoring:** Enabled (Health Check: ${
        server.monitoring.healthCheck?.endpoint || "/health"
      } every ${server.monitoring.healthCheck?.interval || 30}s)`
    : "- **Monitoring:** Disabled"
}

## Endpoints

${server.endpoints
  .filter((e) => e.enabled)
  .map(
    (endpoint) => `
### ${endpoint.method} ${endpoint.path}

**Tool Name:** ${endpoint.toolName}
**Description:** ${endpoint.description}

${
  endpoint.parameters.length > 0
    ? `
#### Parameters
${endpoint.parameters
  .map(
    (param) => `
- **${param.name}** (${param.type}) ${
      param.required ? "**required**" : "optional"
    }
  ${param.description || "No description"}
  ${param.defaultValue !== undefined ? `Default: ${param.defaultValue}` : ""}
  ${param.validation?.min !== undefined ? `Min: ${param.validation.min}` : ""}
  ${param.validation?.max !== undefined ? `Max: ${param.validation.max}` : ""}
  ${param.validation?.pattern ? `Pattern: ${param.validation.pattern}` : ""}
  ${param.enum ? `Values: ${param.enum.join(", ")}` : ""}
`
  )
  .join("")}
`
    : "#### Parameters\nNone"
}

${
  endpoint.body
    ? `
#### Request Body
Type: ${endpoint.body.type}
Required: ${endpoint.body.required ? "Yes" : "No"}
${
  endpoint.body.schema
    ? `\n\`\`\`json\n${JSON.stringify(endpoint.body.schema, null, 2)}\n\`\`\``
    : ""
}
`
    : ""
}

${
  endpoint.caching?.enabled
    ? `
#### Caching
- **Enabled:** Yes
- **TTL:** ${endpoint.caching.ttl || 300}s
- **Key:** ${endpoint.caching.key || "auto-generated"}
`
    : ""
}

${
  endpoint.rateLimit
    ? `
#### Rate Limiting
- **Requests:** ${endpoint.rateLimit.requests}
- **Window:** ${endpoint.rateLimit.windowMs}ms
`
    : ""
}

`
  )
  .join("")}

## Error Handling

All endpoints return standard HTTP status codes:
- **200-299:** Success
- **400:** Bad Request (invalid parameters)
- **401:** Unauthorized (authentication required)
- **403:** Forbidden (access denied)
- **404:** Not Found
- **429:** Too Many Requests (rate limit exceeded)
- **500:** Internal Server Error

Error responses include:
\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`

## Rate Limiting

${
  server.rateLimit
    ? `
Global rate limit: ${server.rateLimit.requests} requests per ${
        server.rateLimit.windowMs
      }ms (${server.rateLimit.strategy || "fixed"} window)
`
    : "No global rate limiting configured"
}

Individual endpoints may have their own rate limits as documented above.

## Caching

${
  server.caching?.enabled
    ? `
Caching is enabled globally with the following settings:
- **Default TTL:** ${server.caching.defaultTtl || 300}s
- **Max Cache Size:** ${server.caching.maxSize || 1000}MB

Individual endpoints may override these settings.
`
    : "Caching is disabled globally. Individual endpoints may still have caching enabled."
}

## Monitoring

${
  server.monitoring?.enabled
    ? `
Health monitoring is enabled:
- **Health Check Endpoint:** ${
        server.monitoring.healthCheck?.endpoint || "/health"
      }
- **Check Interval:** ${server.monitoring.healthCheck?.interval || 30}s
- **Metrics Collection:** ${
        server.monitoring.metrics?.enabled ? "Enabled" : "Disabled"
      }
${
  server.monitoring.metrics?.enabled
    ? `- **Metrics Retention:** ${
        server.monitoring.metrics.retention || 7
      } days`
    : ""
}
`
    : "Monitoring is disabled"
}

## Logging

${
  server.logging
    ? `
Logging configuration:
- **Level:** ${server.logging.level || "info"}
- **Log Requests:** ${server.logging.requests ? "Yes" : "No"}
- **Log Responses:** ${server.logging.responses ? "Yes" : "No"}
- **Log Errors:** ${server.logging.errors !== false ? "Yes" : "No"}
`
    : "Default logging configuration applied"
}

---

*This documentation was automatically generated from the API server configuration.*
`;

    // Save documentation to file
    const serverDir = path.join(process.cwd(), "generated-servers", serverId);
    const docPath = path.join(serverDir, "README.md");
    await fs.writeFile(docPath, doc);

    return doc;
  }
}

export default APIServerService;
