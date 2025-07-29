import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { EventEmitter } from "events";
import Store from "electron-store";
import { v4 as uuidv4 } from "uuid";
import {
  ServerConfig,
  ServerStatus,
  Tool,
  Resource,
  Prompt,
} from "../../shared/types";
import { LoggingService } from "../services/LoggingService";

// Define the store schema
interface StoreSchema {
  servers: ServerConfig[];
  toolStates: Record<string, boolean>; // toolId -> enabled state
}

export class MCPManager extends EventEmitter {
  private servers: Map<string, ServerStatus> = new Map();
  private clients: Map<string, Client> = new Map();
  private store: any; // Using any to avoid electron-store typing issues
  private uptimeTrackers: Map<string, NodeJS.Timeout> = new Map(); // Track uptime intervals
  private loggingService: LoggingService;

  constructor(store: Store<StoreSchema>, loggingService: LoggingService) {
    super();
    this.store = store;
    this.loggingService = loggingService;
    this.loadServers();
    // Auto-start sequential thinking server
    this.ensureSequentialThinkingServer();
  }

  private async ensureSequentialThinkingServer() {
    const SEQUENTIAL_THINKING_SERVER_ID = "sequential-thinking-builtin";

    // Check if sequential thinking server already exists
    const servers: ServerConfig[] = this.store.get("servers", []);
    const existingServer = servers.find(
      (s) => s.id === SEQUENTIAL_THINKING_SERVER_ID
    );

    if (!existingServer) {
      // Add the sequential thinking server configuration
      const sequentialThinkingConfig: ServerConfig = {
        id: SEQUENTIAL_THINKING_SERVER_ID,
        name: "Sequential Thinking (Built-in)",
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
        env: {},
      };

      try {
        await this.addServer(sequentialThinkingConfig);

        // Auto-connect the server
        setTimeout(async () => {
          try {
            await this.connectServer(SEQUENTIAL_THINKING_SERVER_ID);
          } catch (error) {
            console.warn(
              "⚠️ Failed to auto-connect sequential thinking server:",
              error
            );
          }
        }, 1000); // Small delay to ensure server is ready
      } catch (error) {
        console.warn("⚠️ Failed to add sequential thinking server:", error);
      }
    } else {
      // Server exists, try to connect if not already connected
      const serverStatus = this.servers.get(SEQUENTIAL_THINKING_SERVER_ID);
      if (serverStatus && !serverStatus.connected) {
        setTimeout(async () => {
          try {
            await this.connectServer(SEQUENTIAL_THINKING_SERVER_ID);
            console.log(
              "✅ Sequential thinking server reconnected automatically"
            );
          } catch (error) {
            console.warn(
              "⚠️ Failed to reconnect sequential thinking server:",
              error
            );
          }
        }, 1000);
      }
    }
  }

  private loadServers() {
    const savedServers: ServerConfig[] = this.store.get("servers", []);
    savedServers.forEach((config: ServerConfig) => {
      this.servers.set(config.id!, {
        id: config.id!,
        name: config.name,
        connected: false,
      });
    });
  }

  async addServer(config: ServerConfig): Promise<ServerStatus> {
    const id = config.id || uuidv4();
    const serverConfig = { ...config, id };

    const servers: ServerConfig[] = this.store.get("servers", []);
    servers.push(serverConfig);
    this.store.set("servers", servers);

    const status: ServerStatus = {
      id,
      name: config.name,
      connected: false,
    };

    this.servers.set(id, status);
    return status;
  }

  async removeServer(id: string): Promise<void> {
    await this.disconnectServer(id);
    this.servers.delete(id);

    const servers: ServerConfig[] = this.store.get("servers", []);
    const filtered = servers.filter((s: ServerConfig) => s.id !== id);
    this.store.set("servers", filtered);
  }

  listServers(): ServerStatus[] {
    return Array.from(this.servers.values());
  }

  async connectServer(id: string): Promise<void> {
    const servers: ServerConfig[] = this.store.get("servers", []);
    const config = servers.find((s: ServerConfig) => s.id === id);

    if (!config) {
      throw new Error(`Server ${id} not found`);
    }

    try {
      let transport;

      if (config.type === "stdio") {
        // Ensure we have the proper PATH environment for command execution
        const processEnv = Object.fromEntries(
          Object.entries(process.env).filter(
            ([_, value]) => value !== undefined
          )
        ) as Record<string, string>;

        // On macOS, GUI apps don't inherit shell PATH, so add common locations
        const currentPath = processEnv.PATH || "";
        const commonPaths = [
          "/usr/local/bin",
          "/opt/homebrew/bin",
          "/Users/" + require("os").userInfo().username + "/.local/bin",
          "/Library/Frameworks/Python.framework/Versions/3.10/bin",
          "/Library/Frameworks/Python.framework/Versions/3.11/bin",
          "/Library/Frameworks/Python.framework/Versions/3.12/bin",
          "/usr/bin",
          "/bin",
        ];

        const enhancedPath = [currentPath, ...commonPaths]
          .filter(Boolean)
          .join(":");

        const env = {
          ...processEnv,
          PATH: enhancedPath,
          ...config.env, // Override with any custom environment variables
        };

        // Clean up arguments to remove any extra quotes that might have been added during serialization
        const cleanArgs = (config.args || []).map((arg) => {
          if (typeof arg === "string") {
            // Remove surrounding quotes if they exist
            return arg.replace(/^["']|["']$/g, "");
          }
          return arg;
        });

        this.loggingService.addLog(
          "info",
          "MCPManager",
          `Starting server "${config.name}"`,
          {
            command: config.command,
            args: cleanArgs,
            type: config.type,
          },
          {
            serverId: id,
            serverName: config.name,
            category: "server",
          }
        );

        transport = new StdioClientTransport({
          command: config.command!,
          args: cleanArgs,
          env: env,
        });
      } else {
        transport = new SSEClientTransport(new URL(config.url!));
      }

      const client = new Client(
        {
          name: "MCP Desktop Client",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
            sampling: {},
          },
        }
      );
      await client.connect(transport);
      this.clients.set(id, client);

      const status = this.servers.get(id)!;
      status.connected = true;
      status.connectionStartTime = new Date();
      status.uptime = 0;
      this.servers.set(id, status);

      // Start uptime tracking
      this.startUptimeTracking(id);

      this.loggingService.addLog(
        "success",
        "MCPManager",
        `Server "${status.name}" connected successfully`,
        {
          serverId: id,
          connectionTime: new Date().toISOString(),
        },
        {
          serverId: id,
          serverName: status.name,
          category: "server",
        }
      );

      // Try to list tools immediately after connection and populate the status
      try {
        const toolsResponse = await client.listTools();
        console.log(
          `MCPManager: Server ${id} tools:`,
          toolsResponse.tools?.length || 0
        );
        if (toolsResponse.tools && toolsResponse.tools.length > 0) {
          console.log(
            "Available tools:",
            toolsResponse.tools.map((t) => t.name)
          );
          status.tools = toolsResponse.tools;

          this.loggingService.addLog(
            "info",
            "MCPManager",
            `Loaded ${toolsResponse.tools.length} tools from server "${status.name}"`,
            {
              tools: toolsResponse.tools.map((t) => t.name),
            },
            {
              serverId: id,
              serverName: status.name,
              category: "server",
            }
          );
        } else {
          status.tools = [];
        }
      } catch (toolError) {
        console.log(`MCPManager: Error listing tools for ${id}:`, toolError);
        status.tools = [];

        this.loggingService.addLog(
          "warning",
          "MCPManager",
          `Failed to load tools from server "${status.name}"`,
          { error: String(toolError) },
          {
            serverId: id,
            serverName: status.name,
            category: "server",
          }
        );
      }

      // Try to list resources
      try {
        const resourcesResponse = await client.listResources();
        status.resources = resourcesResponse.resources || [];
        console.log(
          `MCPManager: Server ${id} resources:`,
          status.resources.length
        );
      } catch (resourceError: any) {
        // Check if this is a "Method not found" error - this is expected for servers that don't implement resources
        if (resourceError?.code === -32601) {
          console.log(
            `MCPManager: Server ${id} does not implement resources (this is optional)`
          );
        } else {
          console.log(
            `MCPManager: Error listing resources for ${id}:`,
            resourceError
          );
        }
        status.resources = [];
      }

      // Try to list prompts
      try {
        const promptsResponse = await client.listPrompts();
        status.prompts = promptsResponse.prompts || [];
        console.log(`MCPManager: Server ${id} prompts:`, status.prompts.length);
      } catch (promptError: any) {
        // Check if this is a "Method not found" error - this is expected for servers that don't implement prompts
        if (promptError?.code === -32601) {
          console.log(
            `MCPManager: Server ${id} does not implement prompts (this is optional)`
          );
        } else {
          console.log(
            `MCPManager: Error listing prompts for ${id}:`,
            promptError
          );
        }
        status.prompts = [];
      }

      // Update the server status with the populated data
      this.servers.set(id, status);

      this.emit("serverConnected", status);
    } catch (error) {
      const status = this.servers.get(id)!;
      status.connected = false;

      if (error instanceof Error) {
        if (
          error.message.includes("ENOENT") ||
          error.message.includes("spawn")
        ) {
          const servers: ServerConfig[] = this.store.get("servers", []);
          const config = servers.find((s) => s.id === id);
          const command = config?.command || "command";
          status.error = `Command not found: '${command}'. Make sure it's installed and in your PATH.`;
        } else if (
          error.message.includes("ZoneInfoNotFoundError") ||
          error.message.includes("No time zone found")
        ) {
          status.error = `Invalid timezone. Try using 'America/New_York' or remove the timezone argument entirely.`;
        } else if (error.message.includes("Connection closed")) {
          status.error = `Server failed to start. Check your command and arguments.`;
        } else {
          status.error = error.message;
        }
      } else {
        status.error = "Connection failed";
      }

      this.servers.set(id, status);
      this.emit("serverError", status);
      throw error;
    }
  }

  async disconnectServer(id: string): Promise<void> {
    // Stop uptime tracking
    this.stopUptimeTracking(id);

    const client = this.clients.get(id);
    if (client) {
      await client.close();
      this.clients.delete(id);
    }

    const status = this.servers.get(id);
    if (status) {
      status.connected = false;
      status.error = undefined;
      status.tools = [];
      status.resources = [];
      status.prompts = [];
      status.uptime = 0;
      status.connectionStartTime = undefined;
      this.servers.set(id, status);
      this.emit("serverDisconnected", status);
    }
  }

  async listTools(serverId?: string): Promise<Tool[]> {
    const tools: Tool[] = [];

    const clientsToQuery = serverId
      ? ([this.clients.get(serverId)].filter(Boolean) as Client[])
      : Array.from(this.clients.values());

    for (const client of clientsToQuery) {
      try {
        // Find the serverId for this client
        const currentServerId =
          serverId ||
          Array.from(this.clients.entries()).find(
            ([id, c]) => c === client
          )?.[0];

        const response = await client.listTools();
        if (response.tools) {
          tools.push(
            ...response.tools.map((tool) => ({
              name: tool.name,
              description: tool.description || "",
              inputSchema: tool.inputSchema,
              serverId: currentServerId, // Track which server this tool belongs to
            }))
          );
        }
      } catch (error) {
        console.error("MCPManager: Error listing tools:", error);
      }
    }

    return tools;
  }

  // Method for UI - shows all tools including sequential thinking (marked as system tool) with enabled states
  async listToolsForUI(serverId?: string): Promise<Tool[]> {
    const allTools = await this.listTools(serverId);
    // Mark sequential thinking tool as a system tool and add enabled states
    return allTools.map((tool) => ({
      ...tool,
      isSystemTool: tool.name === "sequentialthinking",
      enabled: tool.serverId
        ? this.isToolEnabled(tool.name, tool.serverId)
        : true,
    }));
  }

  // Method for agent - includes only enabled tools
  async listToolsForAgent(serverId?: string): Promise<Tool[]> {
    return this.listEnabledToolsForAgent(serverId);
  }

  async listResources(serverId?: string): Promise<Resource[]> {
    const resources: Resource[] = [];

    const clientsToQuery = serverId
      ? ([this.clients.get(serverId)].filter(Boolean) as Client[])
      : Array.from(this.clients.values());

    for (const client of clientsToQuery) {
      try {
        const response = await client.listResources();
        if (response.resources) {
          resources.push(
            ...response.resources.map((resource) => ({
              uri: resource.uri,
              name: resource.name || "",
              description: resource.description || "",
              mimeType: resource.mimeType,
            }))
          );
        }
      } catch (error: any) {
        // Only log as error if it's not a "Method not found" (resources are optional)
        if (error?.code !== -32601) {
          console.error("Error listing resources:", error);
        }
      }
    }

    return resources;
  }

  async listPrompts(serverId?: string): Promise<Prompt[]> {
    const prompts: Prompt[] = [];

    const clientsToQuery = serverId
      ? ([this.clients.get(serverId)].filter(Boolean) as Client[])
      : Array.from(this.clients.values());

    for (const client of clientsToQuery) {
      try {
        const response = await client.listPrompts();
        if (response.prompts) {
          prompts.push(
            ...response.prompts.map((prompt) => ({
              name: prompt.name,
              description: prompt.description || "",
              arguments: prompt.arguments,
            }))
          );
        }
      } catch (error: any) {
        // Only log as error if it's not a "Method not found" (prompts are optional)
        if (error?.code !== -32601) {
          console.error("Error listing prompts:", error);
        }
      }
    }

    return prompts;
  }

  async callTool(name: string, args: any, serverId?: string): Promise<any> {
    // If serverId is specified, use that client
    if (serverId) {
      const client = this.clients.get(serverId);
      if (!client) {
        throw new Error(`Server ${serverId} not connected`);
      }

      const serverStatus = this.servers.get(serverId);
      const serverName = serverStatus?.name || serverId;

      // Auto-inject context parameters for this server
      const enhancedArgs = this.enhanceArgsWithContext(serverId, args);
      console.log(
        `MCPManager: Calling tool ${name} on server ${serverId} with enhanced args:`,
        enhancedArgs
      );

      this.loggingService.addLog(
        "info",
        "MCPManager",
        `Executing tool "${name}" on server "${serverName}"`,
        {
          toolName: name,
          arguments: enhancedArgs,
          serverId,
        },
        {
          serverId,
          serverName,
          toolName: name,
          category: "tool",
        }
      );

      // Debug: Let's also log the tool schema to understand what it expects
      try {
        const toolsResponse = await client.listTools();
        const tool = toolsResponse.tools.find((t) => t.name === name);
        if (tool) {
          console.log(
            `MCPManager: Tool ${name} schema:`,
            JSON.stringify(tool.inputSchema, null, 2)
          );
        }
      } catch (e) {
        console.log(`MCPManager: Could not get tool schema for ${name}`);
      }

      // Update last activity before calling the tool
      this.updateLastActivity(serverId);

      try {
        const response = await client.callTool({
          name,
          arguments: enhancedArgs,
        });
        // console.log(`MCPManager: Raw response from tool ${name}:`, response);

        this.loggingService.addLog(
          "success",
          "MCPManager",
          `Tool "${name}" executed successfully on server "${serverName}"`,
          {
            toolName: name,
            result: response.content,
            serverId,
          },
          {
            serverId,
            serverName,
            toolName: name,
            category: "tool",
          }
        );

        return response.content;
      } catch (error) {
        this.loggingService.addLog(
          "error",
          "MCPManager",
          `Tool "${name}" failed on server "${serverName}"`,
          {
            toolName: name,
            error: String(error),
            serverId,
          },
          {
            serverId,
            serverName,
            toolName: name,
            category: "tool",
          }
        );
        throw error;
      }
    }

    // Otherwise, try all connected clients until one succeeds
    const errors: string[] = [];
    for (const [id, client] of this.clients.entries()) {
      try {
        const enhancedArgs = this.enhanceArgsWithContext(id, args);

        // Update last activity for this server
        this.updateLastActivity(id);

        const response = await client.callTool({
          name,
          arguments: enhancedArgs,
        });
        return response.content;
      } catch (error) {
        errors.push(
          `${id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    throw new Error(`Tool ${name} failed on all servers: ${errors.join(", ")}`);
  }

  private enhanceArgsWithContext(serverId: string, args: any): any {
    // Get the server config to find context parameters
    const servers: ServerConfig[] = this.store.get("servers", []);
    const serverConfig = servers.find((s) => s.id === serverId);

    if (!serverConfig || !serverConfig.contextParams) {
      return args;
    }

    // Merge context parameters with provided args (context params take precedence)
    const enhancedArgs = { ...args, ...serverConfig.contextParams };

    console.log(
      `MCPManager: Enhanced args for server ${serverId}:`,
      enhancedArgs
    );
    return enhancedArgs;
  }

  async readResource(uri: string, serverId?: string): Promise<any> {
    // If serverId is specified, use that client
    if (serverId) {
      const client = this.clients.get(serverId);
      if (!client) {
        throw new Error(`Server ${serverId} not connected`);
      }

      // Update last activity
      this.updateLastActivity(serverId);

      const response = await client.readResource({ uri });
      return response.contents;
    }

    // Otherwise, try all connected clients until one succeeds
    const errors: string[] = [];
    for (const [id, client] of this.clients.entries()) {
      try {
        // Update last activity for this server
        this.updateLastActivity(id);

        const response = await client.readResource({ uri });
        return response.contents;
      } catch (error) {
        errors.push(
          `${id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    throw new Error(
      `Resource ${uri} not found on any server: ${errors.join(", ")}`
    );
  }

  async getPrompt(name: string, args?: any, serverId?: string): Promise<any> {
    // If serverId is specified, use that client
    if (serverId) {
      const client = this.clients.get(serverId);
      if (!client) {
        throw new Error(`Server ${serverId} not connected`);
      }
      const response = await client.getPrompt({ name, arguments: args });
      return response.messages;
    }

    // Otherwise, try all connected clients until one succeeds
    const errors: string[] = [];
    for (const [id, client] of this.clients.entries()) {
      try {
        const response = await client.getPrompt({ name, arguments: args });
        return response.messages;
      } catch (error) {
        errors.push(
          `${id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    throw new Error(
      `Prompt ${name} not found on any server: ${errors.join(", ")}`
    );
  }

  getServerConfig(id: string): ServerConfig | null {
    const servers: ServerConfig[] = this.store.get("servers", []);
    return servers.find((s: ServerConfig) => s.id === id) || null;
  }

  async updateServer(id: string, config: ServerConfig): Promise<ServerStatus> {
    // Disconnect the server if it's currently connected
    await this.disconnectServer(id);

    // Update the configuration in storage
    const servers: ServerConfig[] = this.store.get("servers", []);
    const serverIndex = servers.findIndex((s: ServerConfig) => s.id === id);

    if (serverIndex === -1) {
      throw new Error(`Server ${id} not found`);
    }

    // Ensure the ID remains the same
    const updatedConfig = { ...config, id };
    servers[serverIndex] = updatedConfig;
    this.store.set("servers", servers);

    // Update the server status
    const status = this.servers.get(id);
    if (status) {
      status.name = config.name;
      this.servers.set(id, status);
    }

    return (
      status || {
        id,
        name: config.name,
        connected: false,
      }
    );
  }

  /**
   * Auto-discover context parameters by analyzing tool schemas
   */
  async discoverContextParameters(
    serverId: string
  ): Promise<Record<string, string>> {
    const client = this.clients.get(serverId);
    if (!client) {
      return {};
    }

    try {
      const toolsResponse = await client.listTools();
      const suggestedParams: Record<string, string> = {};
      const paramCounts: Record<string, number> = {};

      // Analyze all tool schemas to find common parameters
      for (const tool of toolsResponse.tools) {
        if (tool.inputSchema?.properties) {
          for (const [paramName, paramSchema] of Object.entries(
            tool.inputSchema.properties
          )) {
            const schema = paramSchema as any;

            // Look for parameters that are commonly context parameters
            const isContextParam = this.isLikelyContextParameter(
              paramName,
              schema
            );
            if (isContextParam) {
              paramCounts[paramName] = (paramCounts[paramName] || 0) + 1;

              // Suggest default values based on parameter name patterns
              if (!suggestedParams[paramName]) {
                suggestedParams[paramName] = this.suggestDefaultValue(
                  paramName,
                  schema
                );
              }
            }
          }
        }
      }

      // Only suggest parameters that appear in multiple tools (likely context params)
      const contextParams: Record<string, string> = {};
      for (const [paramName, count] of Object.entries(paramCounts)) {
        if (count > 1 || this.isCommonContextParam(paramName)) {
          contextParams[paramName] = suggestedParams[paramName];
        }
      }

      console.log(
        `MCPManager: Discovered context parameters for ${serverId}:`,
        contextParams
      );
      return contextParams;
    } catch (error) {
      console.error("Error discovering context parameters:", error);
      return {};
    }
  }

  private isLikelyContextParameter(paramName: string, schema: any): boolean {
    const contextParamPatterns = [
      // File/directory paths
      /^(repo_path|repository_path|repo-path|repository-path|path|dir|directory|root_path|base_path|working_dir|cwd)$/i,
      // Project/workspace identifiers
      /^(project_id|workspace_id|project_key|workspace|project)$/i,
      // API keys and credentials
      /^(api_key|token|auth_token|access_token|secret|credentials)$/i,
      // Base URLs and endpoints
      /^(base_url|endpoint|server_url|host|hostname)$/i,
      // Database connections
      /^(db_url|database_url|connection_string|db_host|db_name)$/i,
    ];

    const nameMatches = contextParamPatterns.some((pattern) =>
      pattern.test(paramName)
    );

    // Also check if the description suggests it's a context parameter
    const description = schema.description || "";
    const descriptionSuggests =
      /\b(path|directory|workspace|project|repository|base|root|default)\b/i.test(
        description
      );

    return nameMatches || descriptionSuggests;
  }

  private isCommonContextParam(paramName: string): boolean {
    const commonParams = [
      "repo_path",
      "repository_path",
      "project_id",
      "workspace_id",
      "api_key",
      "base_url",
    ];
    return commonParams.includes(paramName.toLowerCase());
  }

  private suggestDefaultValue(paramName: string, schema: any): string {
    // Suggest default values based on parameter name patterns
    if (
      /^(repo_path|repository_path|repo-path|repository-path)$/i.test(paramName)
    ) {
      return process.cwd(); // Current working directory
    }
    if (/^(project_id|workspace_id)$/i.test(paramName)) {
      return "your-project-id";
    }
    if (/^(api_key|token|auth_token)$/i.test(paramName)) {
      return "your-api-key";
    }
    if (/^(base_url|endpoint|server_url)$/i.test(paramName)) {
      return "https://api.example.com";
    }
    if (/^(db_url|database_url)$/i.test(paramName)) {
      return "postgresql://localhost:5432/dbname";
    }

    // Default based on schema type
    if (schema.type === "string") {
      return schema.default || "";
    }
    if (schema.type === "number") {
      return schema.default || "0";
    }
    if (schema.type === "boolean") {
      return schema.default ? "true" : "false";
    }

    return "";
  }

  private startUptimeTracking(serverId: string): void {
    // Clear any existing tracker
    this.stopUptimeTracking(serverId);

    // Start a new interval tracker
    const interval = setInterval(() => {
      const status = this.servers.get(serverId);
      if (status && status.connected && status.connectionStartTime) {
        const now = new Date();
        status.uptime = Math.floor(
          (now.getTime() - status.connectionStartTime.getTime()) / 1000
        );
        this.servers.set(serverId, status);
      }
    }, 1000); // Update every second

    this.uptimeTrackers.set(serverId, interval);
  }

  private stopUptimeTracking(serverId: string): void {
    const interval = this.uptimeTrackers.get(serverId);
    if (interval) {
      clearInterval(interval);
      this.uptimeTrackers.delete(serverId);
    }
  }

  public updateLastActivity(serverId: string): void {
    const status = this.servers.get(serverId);
    if (status) {
      status.lastActivity = new Date();
      this.servers.set(serverId, status);
      console.log(`MCPManager: Updated last activity for server ${serverId}`);
    }
  }

  // Tool state management methods
  private getToolId(toolName: string, serverId: string): string {
    return `${serverId}:${toolName}`;
  }

  public getToolStates(): Record<string, boolean> {
    return this.store.get("toolStates", {});
  }

  public setToolEnabled(
    toolName: string,
    serverId: string,
    enabled: boolean
  ): void {
    const toolId = this.getToolId(toolName, serverId);
    const toolStates = this.getToolStates();
    toolStates[toolId] = enabled;
    this.store.set("toolStates", toolStates);

    this.loggingService.addLog(
      "info",
      "MCPManager",
      `Tool "${toolName}" ${
        enabled ? "enabled" : "disabled"
      } for server "${serverId}"`,
      { toolName, serverId, enabled },
      { serverId, toolName, category: "tool" }
    );

    // Emit event to refresh agent
    this.emit("toolStateChanged", { toolName, serverId, enabled });
  }

  public isToolEnabled(toolName: string, serverId: string): boolean {
    const toolId = this.getToolId(toolName, serverId);
    const toolStates = this.getToolStates();
    // Default to enabled for new tools
    return toolStates[toolId] !== false;
  }

  public toggleToolState(toolName: string, serverId: string): boolean {
    const currentState = this.isToolEnabled(toolName, serverId);
    const newState = !currentState;
    this.setToolEnabled(toolName, serverId, newState);
    return newState;
  }

  // Enhanced method for agent - only returns enabled tools
  async listEnabledToolsForAgent(serverId?: string): Promise<Tool[]> {
    const allTools = await this.listTools(serverId);
    return allTools.filter((tool) => {
      if (!tool.serverId) return true; // Include tools without serverId for backward compatibility
      return this.isToolEnabled(tool.name, tool.serverId);
    });
  }
}
