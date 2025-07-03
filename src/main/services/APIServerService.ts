import { ipcMain } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { APIServerConfig, APIServerStatus } from "../../shared/apiServerTypes";
import { MCPManager } from "../mcp/MCPManager";
import { RobustCodeGenerator } from "./RobustCodeGenerator";

class APIServerService {
  private apiServers: Map<string, APIServerConfig> = new Map();
  private runningServers: Map<
    string,
    { process: ChildProcess; status: APIServerStatus }
  > = new Map();
  private configPath: string;
  private mcpManager: MCPManager | null = null;
  private codeGenerator: RobustCodeGenerator;

  constructor(mcpManager?: MCPManager) {
    this.configPath = path.join(process.cwd(), "api-servers.json");
    this.mcpManager = mcpManager || null;
    this.codeGenerator = new RobustCodeGenerator();
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

    // Get server status
    ipcMain.handle("api-server:status", async (_, serverId: string) => {
      return this.getServerStatus(serverId);
    });

    // Get server status (alternative endpoint name for consistency)
    ipcMain.handle("api-server:get-status", async (_, serverId: string) => {
      return this.getServerStatus(serverId);
    });

    // Build server
    ipcMain.handle("api-server:build", async (_, serverId: string) => {
      return this.buildServer(serverId);
    });

    // Test API call
    ipcMain.handle(
      "api-server:test-call",
      async (_, url: string, options: any) => {
        return this.testAPICall(url, options);
      }
    );

    // Transfer OAuth2 token from renderer to main process
    ipcMain.handle(
      "api-server:transfer-oauth2-token",
      async (_, serverId: string, tokenData: any) => {
        return this.storeOAuth2Token(serverId, tokenData);
      }
    );
  }

  private setupDocumentationHandler() {
    // Generate documentation
    ipcMain.handle("api-server:generate-docs", async (_, serverId: string) => {
      return this.generateDocumentation(serverId);
    });
  }

  private async loadSavedServers() {
    try {
      const configExists = await fs
        .access(this.configPath)
        .then(() => true)
        .catch(() => false);

      if (configExists) {
        const configData = await fs.readFile(this.configPath, "utf-8");
        const servers: APIServerConfig[] = JSON.parse(configData);
        servers.forEach((server) => {
          this.apiServers.set(server.id, server);
        });
      }
    } catch (error) {
      console.error("Failed to load saved servers:", error);
    }
  }

  private async saveConfig() {
    try {
      const servers = Array.from(this.apiServers.values());
      await fs.writeFile(this.configPath, JSON.stringify(servers, null, 2));
    } catch (error) {
      console.error("Failed to save config:", error);
      throw error;
    }
  }

  async saveServer(config: APIServerConfig): Promise<void> {
    try {
      // Set timestamps
      if (!config.created) {
        config.created = new Date();
      }
      config.updated = new Date();

      // Generate unique ID if not provided
      if (!config.id) {
        config.id = `api-server-${Date.now()}`;
      }

      // Store in memory
      this.apiServers.set(config.id, config);

      // Generate MCP server
      await this.generateMCPServer(config);

      // Save to disk
      await this.saveConfig();
    } catch (error) {
      console.error("Failed to save server:", error);
      throw error;
    }
  }

  async deleteServer(serverId: string): Promise<void> {
    try {
      // Stop server if running
      if (this.runningServers.has(serverId)) {
        await this.stopServer(serverId);
      }

      // Remove from MCPManager if available
      if (this.mcpManager) {
        try {
          await this.mcpManager.removeServer(serverId);
          console.log(`Removed MCP server from manager: ${serverId}`);
        } catch (error) {
          console.warn(
            `Failed to remove MCP server from manager: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Remove from memory
      this.apiServers.delete(serverId);

      // Remove generated files
      const serverDir = path.join(process.cwd(), "generated-servers", serverId);
      try {
        await fs.rm(serverDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(
          `Could not remove server directory: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Save config
      await this.saveConfig();

      console.log(`Deleted API server: ${serverId}`);
    } catch (error) {
      console.error("Failed to delete server:", error);
      throw error;
    }
  }

  private async generateMCPServer(config: APIServerConfig): Promise<void> {
    try {
      // Generate the MCP server TypeScript file using robust code generator
      const serverCode = await this.codeGenerator.generateMCPServerCode(config);

      // Create directory if it doesn't exist
      const serverDir = path.join(
        process.cwd(),
        "generated-servers",
        config.id
      );
      await fs.mkdir(serverDir, { recursive: true });

      // Handle OAuth2 token transfer from browser to file system
      if (config.authentication?.type === "oauth2") {
        await this.copyOAuth2TokenToFileSystem(config.id);
      }

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
          build:
            "tsc server.ts --outDir . --target es2020 --module commonjs --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports",
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
    } catch (error) {
      console.error(`Failed to generate MCP server for ${config.name}:`, error);
      throw error;
    }
  }

  private async buildServer(serverId: string): Promise<void> {
    const serverDir = path.join(process.cwd(), "generated-servers", serverId);
    const serverPath = path.join(serverDir, "server.ts");

    try {
      return new Promise((resolve, reject) => {
        const buildProcess = spawn(
          "npx",
          [
            "tsc",
            "server.ts",
            "--outDir",
            ".",
            "--target",
            "es2020",
            "--module",
            "commonjs",
            "--moduleResolution",
            "node",
            "--esModuleInterop",
            "--allowSyntheticDefaultImports",
          ],
          {
            cwd: serverDir,
            stdio: ["pipe", "pipe", "pipe"],
          }
        );

        let stdout = "";
        let stderr = "";

        buildProcess.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        buildProcess.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        buildProcess.on("exit", (code: number | null) => {
          if (code === 0) {
            console.log(`Built MCP server for ${serverId}`);
            resolve();
          } else {
            console.error(`Build failed for ${serverId}:`, stderr);
            reject(new Error(`Build failed with code ${code}: ${stderr}`));
          }
        });

        buildProcess.on("error", (error: Error) => {
          console.error(`Build process error for ${serverId}:`, error);
          reject(error);
        });
      });
    } catch (error) {
      console.error(`Failed to build server ${serverId}:`, error);
      throw error;
    }
  }

  async startServer(serverId: string): Promise<void> {
    try {
      const server = this.apiServers.get(serverId);
      if (!server) {
        throw new Error("Server not found");
      }

      // Build server first
      await this.buildServer(serverId);

      const serverDir = path.join(process.cwd(), "generated-servers", serverId);
      const serverPath = path.join(serverDir, "server.js");

      const childProcess = spawn("node", [serverPath], {
        cwd: serverDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.runningServers.set(serverId, {
        process: childProcess,
        status: {
          id: serverId,
          status: "running",
          pid: childProcess.pid || 0,
          port: 0,
          startTime: new Date(),
        },
      });

      console.log(
        `Started MCP server: ${server.name} (PID: ${childProcess.pid})`
      );

      // Register with MCPManager if available
      if (this.mcpManager) {
        const mcpServerConfig = {
          id: serverId,
          name: server.name,
          type: "stdio" as const,
          command: "node",
          args: [serverPath],
          env: {},
          description: server.description,
        };

        // Add server to MCPManager
        await this.mcpManager.addServer(mcpServerConfig);

        // Connect to the server
        try {
          await this.mcpManager.connectServer(serverId);
          console.log(`Connected MCP server to manager: ${server.name}`);
        } catch (error) {
          console.warn(
            `Failed to connect MCP server to manager: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    } catch (error) {
      console.error(`Failed to start server ${serverId}:`, error);
      throw error;
    }
  }

  async stopServer(serverId: string): Promise<void> {
    const running = this.runningServers.get(serverId);
    if (!running) {
      return;
    }

    try {
      // Disconnect from MCPManager if available
      if (this.mcpManager) {
        try {
          await this.mcpManager.disconnectServer(serverId);
          console.log(`Disconnected MCP server from manager: ${serverId}`);
        } catch (error) {
          console.warn(
            `Failed to disconnect MCP server from manager: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      running.process.kill("SIGTERM");
      this.runningServers.delete(serverId);
      console.log(`Stopped MCP server: ${serverId}`);
    } catch (error) {
      console.error(`Failed to stop server ${serverId}:`, error);
      throw error;
    }
  }

  getServerStatus(serverId: string): APIServerStatus {
    // First check if it's registered with MCP Manager (more accurate status)
    if (this.mcpManager) {
      const mcpServers = this.mcpManager.listServers();
      const mcpServer = mcpServers.find((server) => server.id === serverId);

      if (mcpServer) {
        console.log(`📊 Getting MCP status for ${serverId}:`, {
          connected: mcpServer.connected,
          error: mcpServer.error,
          toolsCount: mcpServer.tools?.length || 0,
        });

        return {
          id: serverId,
          status: mcpServer.connected ? "running" : "stopped",
          connected: mcpServer.connected,
          pid: 0, // MCP servers don't expose PID
          port: 0, // MCP servers don't expose port
          lastError: mcpServer.error,
          toolsAvailable: mcpServer.tools?.length || 0,
        };
      }
    }

    // Fallback to local process status
    const running = this.runningServers.get(serverId);
    if (running) {
      console.log(`📊 Getting process status for ${serverId}:`, running.status);
      return running.status;
    }

    console.log(`📊 No status found for ${serverId}, returning stopped`);
    return {
      id: serverId,
      status: "stopped",
      pid: 0,
      port: 0,
    };
  }

  async testAPICall(url: string, options: any): Promise<any> {
    const fetch = (await import("node-fetch")).default;

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: options.headers || {},
        body: options.body ? JSON.stringify(options.body) : undefined,
        timeout: options.timeout || 10000,
      });

      const data = await response.text();
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedData,
      };
    } catch (error) {
      throw new Error(
        `API call failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async testEndpoint(
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

    // Build URL with path parameters
    let url = server.baseUrl + endpoint.path;
    if (params) {
      Object.keys(params).forEach((key) => {
        url = url.replace(`{${key}}`, params[key]);
      });
    }

    const options: any = {
      method: endpoint.method,
      headers: {},
    };

    // Add authentication
    if (server.authentication.type === "apikey") {
      const headerName = server.authentication.headerName || "X-API-Key";
      const apiKey =
        server.authentication.credentials?.apiKey ||
        server.authentication.credentials?.key;
      if (apiKey) {
        options.headers[headerName] = apiKey;
      }
    } else if (server.authentication.type === "bearer") {
      const token =
        server.authentication.credentials?.token ||
        server.authentication.credentials?.bearerToken;
      if (token) {
        options.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add query parameters for GET requests
    if (endpoint.method === "GET" && params) {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    // Add body for POST/PUT requests
    if (["POST", "PUT", "PATCH"].includes(endpoint.method) && params) {
      options.headers["Content-Type"] = "application/json";
      options.body = params;
    }

    return await this.testAPICall(url, options);
  }

  async generateDocumentation(serverId: string): Promise<string> {
    const server = this.apiServers.get(serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    const doc = `# ${server.name} API Documentation

Generated on: ${new Date().toISOString()}

## Overview

${server.description || "No description provided."}

**Base URL:** \`${server.baseUrl}\`

## Authentication

**Type:** ${server.authentication.type}

${
  server.authentication.type === "apikey"
    ? `**Header:** ${server.authentication.headerName || "X-API-Key"}`
    : server.authentication.type === "bearer"
    ? "**Header:** Authorization: Bearer <token>"
    : server.authentication.type === "basic"
    ? "**Header:** Authorization: Basic <base64-encoded-credentials>"
    : "No authentication required"
}

## Endpoints

${server.endpoints
  .map(
    (endpoint) => `
### ${endpoint.toolName || endpoint.id}

**Method:** \`${endpoint.method}\`  
**Path:** \`${endpoint.path}\`

${endpoint.description || "No description provided."}

${
  endpoint.parameters && endpoint.parameters.length > 0
    ? `
#### Parameters

${endpoint.parameters
  .map(
    (param) => `
- **${param.name}** (${param.type || "string"}) ${
      param.required ? "**Required**" : "Optional"
    }
  ${param.description || "No description provided."}`
  )
  .join("\n")}
`
    : "No parameters required."
}

${
  endpoint.caching?.enabled
    ? `
#### Caching
- **Enabled:** Yes
- **TTL:** ${endpoint.caching.ttl || 300}s
`
    : ""
}
`
  )
  .join("")}

---

*This documentation was automatically generated from the API server configuration.*
`;

    // Save documentation to file
    const serverDir = path.join(process.cwd(), "generated-servers", serverId);
    const docPath = path.join(serverDir, "README.md");
    await fs.writeFile(docPath, doc);

    return doc;
  }

  getAllServers(): APIServerConfig[] {
    return Array.from(this.apiServers.values());
  }

  // Cleanup method to stop all running servers
  async cleanup() {
    console.log("Cleaning up API servers...");

    const stopPromises = Array.from(this.runningServers.keys()).map(
      (serverId) => this.stopServer(serverId)
    );

    await Promise.all(stopPromises);
    console.log("All API servers stopped");
  }

  private async copyOAuth2TokenToFileSystem(serverId: string): Promise<void> {
    try {
      // Get the server config to access OAuth2 token data
      const config = this.apiServers.get(serverId);
      if (
        config?.authentication?.type === "oauth2" &&
        config.authentication.oauth2?.accessToken
      ) {
        const tokenData = {
          access_token: config.authentication.oauth2.accessToken,
          refresh_token: config.authentication.oauth2.refreshToken,
          expires_at: config.authentication.oauth2.tokenExpiry,
          stored_at: Date.now(),
        };

        await this.storeOAuth2Token(serverId, tokenData);
        console.log(`OAuth2 token copied to file system for ${serverId}`);
      } else {
        console.log(`No OAuth2 token available in config for ${serverId}`);
      }
    } catch (error) {
      console.warn(`Could not copy OAuth2 token for ${serverId}:`, error);
    }
  }

  private async storeOAuth2Token(
    serverId: string,
    tokenData: any
  ): Promise<void> {
    try {
      const os = await import("os");
      const dataDir = path.join(os.homedir(), ".mcp-client");

      // Create directory if it doesn't exist
      await fs.mkdir(dataDir, { recursive: true });

      const tokenFile = path.join(dataDir, `oauth2_token_${serverId}.json`);
      await fs.writeFile(tokenFile, JSON.stringify(tokenData, null, 2));

      console.log(`OAuth2 token stored for server: ${serverId}`);
    } catch (error) {
      console.error(`Failed to store OAuth2 token for ${serverId}:`, error);
      throw error;
    }
  }
}

export default APIServerService;
