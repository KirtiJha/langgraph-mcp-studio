export enum IpcChannels {
  // Server management
  ADD_SERVER = "add-server",
  REMOVE_SERVER = "remove-server",
  LIST_SERVERS = "list-servers",
  GET_SERVER_CONFIG = "get-server-config",
  UPDATE_SERVER = "update-server",
  CONNECT_SERVER = "connect-server",
  DISCONNECT_SERVER = "disconnect-server",

  // Tool operations
  LIST_TOOLS = "list-tools",
  EXECUTE_TOOL = "execute-tool",

  // Agent operations
  SEND_MESSAGE = "send-message",
  CLEAR_CHAT = "clear-chat",

  // Resource operations
  LIST_RESOURCES = "list-resources",
  READ_RESOURCE = "read-resource",

  // Prompt operations
  LIST_PROMPTS = "list-prompts",
  GET_PROMPT = "get-prompt",

  // Context parameter discovery
  DISCOVER_CONTEXT_PARAMS = "discover-context-params",

  // Logging
  GET_LOGS = "get-logs",
  CLEAR_LOGS = "clear-logs",
  LOG_EVENT = "log-event",

  // Public API testing
  TEST_PUBLIC_API = "test-public-api",

  // File operations for server code management
  SELECT_DIRECTORY = "select-directory",
  READ_SERVER_CODE = "read-server-code",
  WRITE_SERVER_CODE = "write-server-code",
  GET_SERVER_FILES = "get-server-files",
  OPEN_SERVER_FOLDER = "open-server-folder",

  // Authentication
  FETCH_USER_INFO = "fetch-user-info",
}

export interface ServerConfig {
  id?: string;
  name: string;
  type: "stdio" | "sse";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  cwd?: string; // Working directory for the server process
  // Store additional context parameters to auto-inject into tool calls
  contextParams?: Record<string, any>;
  // Store tool-specific parameter configurations
  toolConfigs?: Record<string, Record<string, any>>;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
  serverId?: string; // Track which server this tool belongs to
}

export interface Resource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface Prompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "success" | "debug";
  source: string;
  message: string;
  details?: any;
  serverId?: string; // ID of the server this log is related to
  serverName?: string; // Human-readable server name
  toolName?: string; // Name of the tool being executed (if applicable)
  category?: "system" | "server" | "tool" | "api" | "ui"; // Category for better organization
}

export interface ContextParam {
  name: string;
  description?: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  default?: any;
}

export interface ServerStatus {
  id: string;
  name: string;
  connected: boolean;
  error?: string;
  tools?: Tool[];
  resources?: Resource[];
  prompts?: Prompt[];
  toolConfigs?: Record<string, Record<string, any>>; // Pre-configured tool parameters
  uptime?: number; // Connection uptime in seconds
  lastActivity?: Date; // Last time the server was used for a tool call or other operation
  connectionStartTime?: Date; // When the connection was established
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
  error?: string;
  serverId: string;
}

export interface AgentState {
  messages: ChatMessage[];
  currentThought?: string;
  isProcessing: boolean;
  toolCalls: ToolCall[];
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: AuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  createdAt: number;
}

export type AuthProvider = "google" | "github" | "microsoft" | "ibm" | "sso";

export interface AuthConfig {
  providers: {
    google?: {
      clientId: string;
      clientSecret?: string;
      scopes: string[];
    };
    github?: {
      clientId: string;
      clientSecret?: string;
      scopes: string[];
    };
    microsoft?: {
      clientId: string;
      clientSecret?: string;
      tenantId?: string;
      scopes: string[];
    };
    ibm?: {
      clientId: string;
      clientSecret?: string;
      scopes: string[];
      authUrl?: string;
      tokenUrl?: string;
      userInfoUrl?: string;
    };
    sso?: {
      authUrl: string;
      tokenUrl: string;
      clientId: string;
      clientSecret?: string;
      scopes: string[];
      organizationName: string;
      userInfoUrl?: string;
    };
  };
  redirectUri: string;
}

export interface SSOConfig {
  provider: string;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  scopes: string[];
}
