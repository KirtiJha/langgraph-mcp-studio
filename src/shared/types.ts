export {
  MCPServerConfig,
  GeneratedServer,
  GeneratedFile,
} from "../main/services/MCPServerGenerator";

export enum IpcChannels {
  // Server management
  ADD_SERVER = "add-server",
  REMOVE_SERVER = "remove-server",
  LIST_SERVERS = "list-servers",
  GET_SERVER_CONFIG = "get-server-config",
  UPDATE_SERVER = "update-server",
  CONNECT_SERVER = "connect-server",
  DISCONNECT_SERVER = "disconnect-server",
  TEST_REMOTE_SERVER_CONNECTION = "test-remote-server-connection",

  // Tool operations
  LIST_TOOLS = "list-tools",
  EXECUTE_TOOL = "execute-tool",
  TOGGLE_TOOL_STATE = "toggle-tool-state",
  GET_TOOL_STATES = "get-tool-states",
  SET_TOOL_ENABLED = "set-tool-enabled",

  // Agent operations
  SEND_MESSAGE = "send-message",
  SEND_WORKFLOW_MESSAGE = "send-workflow-message",
  CLEAR_CHAT = "clear-chat",

  // Model management
  GET_MODEL_CONFIGS = "get-model-configs",
  SAVE_MODEL_CONFIG = "save-model-config",
  DELETE_MODEL_CONFIG = "delete-model-config",
  TEST_MODEL_CONNECTION = "test-model-connection",
  GET_AVAILABLE_MODELS = "get-available-models",
  SET_DEFAULT_MODEL = "set-default-model",
  GET_OLLAMA_MODELS = "get-ollama-models",

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
  OPEN_SERVER_IN_VSCODE = "open-server-in-vscode",

  // MCP Server generation
  GENERATE_MCP_SERVER = "generate-mcp-server",

  // Authentication
  FETCH_USER_INFO = "fetch-user-info",
}

export interface ServerConfig {
  id: string;
  name: string;
  type: "stdio" | "sse" | "remote";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  enabled: boolean;
  autoRestart: boolean;
  timeout: number;
  tools?: ToolConfig[];
  resources?: ResourceConfig[];
  prompts?: PromptConfig[];
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  contextParams?: Record<string, any>;
  preferredModelId?: string;
  // Remote-specific configuration
  authType?: "none" | "bearer" | "oauth" | "basic" | "apiKey";
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthScopes?: string[];
  oauthTokenEndpoint?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  apiKeyHeader?: string; // e.g., "X-API-Key", "Authorization"
  sessionId?: string;
  description?: string;
  category?: string;
  isOfficial?: boolean;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
  serverId?: string; // Track which server this tool belongs to
  enabled?: boolean; // Whether this tool is enabled for the agent
  isSystemTool?: boolean; // Whether this is a system tool (e.g., sequential thinking)
}

export interface ToolConfig {
  name: string;
  enabled: boolean;
  parameters?: Record<string, any>;
}

export interface Resource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceConfig {
  uri: string;
  enabled: boolean;
  metadata?: Record<string, any>;
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

export interface PromptConfig {
  name: string;
  enabled: boolean;
  defaultArguments?: Record<string, any>;
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
  modelId?: string; // ID of the model used for this tool call
  duration?: number; // Execution duration in milliseconds
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

// LLM Model Configuration Types
export type LLMProvider =
  | "watsonx"
  | "openai"
  | "anthropic"
  | "ollama"
  | "azure"
  | "cohere"
  | "groq";

export interface ModelConfig {
  id: string;
  name: string;
  provider: LLMProvider;
  modelId: string;
  enabled: boolean;
  isDefault?: boolean;
  // Provider-specific configuration
  config:
    | WatsonxConfig
    | OpenAIConfig
    | AnthropicConfig
    | OllamaConfig
    | AzureConfig
    | CohereConfig
    | GroqConfig;
  // Common model parameters
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    repetitionPenalty?: number;
    streaming?: boolean;
    [key: string]: any;
  };
}

export interface WatsonxConfig {
  apiKey: string;
  projectId: string;
  serviceUrl?: string;
  version?: string;
}

export interface OpenAIConfig {
  apiKey: string;
  organizationId?: string;
  baseURL?: string;
}

export interface AnthropicConfig {
  apiKey: string;
  baseURL?: string;
}

export interface OllamaConfig {
  baseURL: string;
  keepAlive?: string;
}

export interface AzureConfig {
  apiKey: string;
  endpoint: string;
  apiVersion?: string;
  deploymentName?: string;
}

export interface CohereConfig {
  apiKey: string;
  baseURL?: string;
}

export interface GroqConfig {
  apiKey: string;
  baseURL?: string;
}

export interface ModelCapabilities {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  contextWindow: number;
  maxOutputTokens?: number;
}

export interface AvailableModel {
  id: string;
  name: string;
  provider: LLMProvider;
  description?: string;
  capabilities: ModelCapabilities;
  isLocal?: boolean;
  isConfigured?: boolean;
}

export interface SSOConfig {
  provider: string;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  scopes: string[];
}
