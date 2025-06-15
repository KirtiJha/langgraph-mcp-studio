export enum IpcChannels {
  // Server management
  ADD_SERVER = 'add-server',
  REMOVE_SERVER = 'remove-server',
  LIST_SERVERS = 'list-servers',
  GET_SERVER_CONFIG = 'get-server-config',
  UPDATE_SERVER = 'update-server',
  CONNECT_SERVER = 'connect-server',
  DISCONNECT_SERVER = 'disconnect-server',
  
  // Tool operations
  LIST_TOOLS = 'list-tools',
  EXECUTE_TOOL = 'execute-tool',
  
  // Agent operations
  SEND_MESSAGE = 'send-message',
  
  // Resource operations
  LIST_RESOURCES = 'list-resources',
  READ_RESOURCE = 'read-resource',
  
  // Prompt operations
  LIST_PROMPTS = 'list-prompts',
  GET_PROMPT = 'get-prompt',
  
  // Context parameter discovery
  DISCOVER_CONTEXT_PARAMS = 'discover-context-params'
}

export interface ServerConfig {
  id?: string;
  name: string;
  type: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  // Store additional context parameters to auto-inject into tool calls
  contextParams?: Record<string, any>;
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

export interface ServerStatus {
  id: string;
  name: string;
  connected: boolean;
  error?: string;
  tools?: Tool[];
  resources?: Resource[];
  prompts?: Prompt[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
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
