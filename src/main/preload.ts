import { contextBridge, ipcRenderer } from "electron";

// Define IpcChannels locally to avoid import issues in preload context
const IpcChannels = {
  ADD_SERVER: "add-server",
  REMOVE_SERVER: "remove-server",
  LIST_SERVERS: "list-servers",
  GET_SERVER_CONFIG: "get-server-config",
  UPDATE_SERVER: "update-server",
  CONNECT_SERVER: "connect-server",
  DISCONNECT_SERVER: "disconnect-server",
  LIST_TOOLS: "list-tools",
  EXECUTE_TOOL: "execute-tool",
  SEND_MESSAGE: "send-message",
  CLEAR_CHAT: "clear-chat",
  GET_MODEL_CONFIGS: "get-model-configs",
  SAVE_MODEL_CONFIG: "save-model-config",
  DELETE_MODEL_CONFIG: "delete-model-config",
  TEST_MODEL_CONNECTION: "test-model-connection",
  GET_AVAILABLE_MODELS: "get-available-models",
  SET_DEFAULT_MODEL: "set-default-model",
  GET_OLLAMA_MODELS: "get-ollama-models",
  LIST_RESOURCES: "list-resources",
  READ_RESOURCE: "read-resource",
  LIST_PROMPTS: "list-prompts",
  GET_PROMPT: "get-prompt",
  DISCOVER_CONTEXT_PARAMS: "discover-context-params",
  GET_LOGS: "get-logs",
  CLEAR_LOGS: "clear-logs",
  LOG_EVENT: "log-event",
  TEST_PUBLIC_API: "test-public-api",
  SELECT_DIRECTORY: "select-directory",
  READ_SERVER_CODE: "read-server-code",
  WRITE_SERVER_CODE: "write-server-code",
  GET_SERVER_FILES: "get-server-files",
  OPEN_SERVER_FOLDER: "open-server-folder",
  FETCH_USER_INFO: "fetch-user-info",
} as const;

const api = {
  // Server management
  addServer: (config: any) =>
    ipcRenderer.invoke(IpcChannels.ADD_SERVER, config),
  removeServer: (id: string) =>
    ipcRenderer.invoke(IpcChannels.REMOVE_SERVER, id),
  listServers: () => ipcRenderer.invoke(IpcChannels.LIST_SERVERS),
  getServerConfig: (id: string) =>
    ipcRenderer.invoke(IpcChannels.GET_SERVER_CONFIG, id),
  updateServer: (id: string, config: any) =>
    ipcRenderer.invoke(IpcChannels.UPDATE_SERVER, id, config),
  connectServer: (id: string) =>
    ipcRenderer.invoke(IpcChannels.CONNECT_SERVER, id),
  disconnectServer: (id: string) =>
    ipcRenderer.invoke(IpcChannels.DISCONNECT_SERVER, id),

  // Tool operations
  listTools: (serverId?: string) =>
    ipcRenderer.invoke(IpcChannels.LIST_TOOLS, serverId),
  executeTool: (serverId: string, toolName: string, args: any) =>
    ipcRenderer.invoke(IpcChannels.EXECUTE_TOOL, { serverId, toolName, args }),

  // Agent operations
  sendMessage: ({ message, model }: { message: string; model?: string }) =>
    ipcRenderer.invoke(IpcChannels.SEND_MESSAGE, { message, model }),
  clearChat: () => ipcRenderer.invoke(IpcChannels.CLEAR_CHAT),

  // Model management operations
  getModelConfigs: () => ipcRenderer.invoke(IpcChannels.GET_MODEL_CONFIGS),
  saveModelConfig: (config: any) => 
    ipcRenderer.invoke(IpcChannels.SAVE_MODEL_CONFIG, config),
  deleteModelConfig: (configId: string) => 
    ipcRenderer.invoke(IpcChannels.DELETE_MODEL_CONFIG, configId),
  setDefaultModel: (configId: string) => 
    ipcRenderer.invoke(IpcChannels.SET_DEFAULT_MODEL, configId),
  testModelConnection: (config: any) => 
    ipcRenderer.invoke(IpcChannels.TEST_MODEL_CONNECTION, config),
  getAvailableModels: () => 
    ipcRenderer.invoke(IpcChannels.GET_AVAILABLE_MODELS),
  getOllamaModels: (baseURL?: string) => 
    ipcRenderer.invoke(IpcChannels.GET_OLLAMA_MODELS, baseURL),

  // Resource operations
  listResources: (serverId: string) =>
    ipcRenderer.invoke(IpcChannels.LIST_RESOURCES, serverId),
  readResource: (serverId: string, uri: string) =>
    ipcRenderer.invoke(IpcChannels.READ_RESOURCE, { serverId, uri }),

  // Prompt operations
  listPrompts: (serverId: string) =>
    ipcRenderer.invoke(IpcChannels.LIST_PROMPTS, serverId),
  getPrompt: (serverId: string, name: string, args: any) =>
    ipcRenderer.invoke(IpcChannels.GET_PROMPT, { serverId, name, args }),

  // Context parameter discovery
  discoverContextParams: (serverId: string) =>
    ipcRenderer.invoke(IpcChannels.DISCOVER_CONTEXT_PARAMS, serverId),

  // Logging operations
  getLogs: () => ipcRenderer.invoke(IpcChannels.GET_LOGS),
  clearLogs: () => ipcRenderer.invoke(IpcChannels.CLEAR_LOGS),

  // Public API testing
  testPublicApi: (options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }) => ipcRenderer.invoke(IpcChannels.TEST_PUBLIC_API, options),

  // OAuth2 operations
  openOAuth2Url: (url: string) => ipcRenderer.invoke("oauth2-open-url", url),
  exchangeOAuth2Token: (config: any, callbackUrl: string) =>
    ipcRenderer.invoke("oauth2-exchange-token", { config, callbackUrl }),
  onOAuth2Callback: (callback: Function) => {
    const subscription = (_: any, url: string) => callback(url);
    ipcRenderer.on("oauth2-callback", subscription);
    return () => {
      ipcRenderer.removeListener("oauth2-callback", subscription);
    };
  },

  // Authentication operations
  getAuthConfig: () => ipcRenderer.invoke("get-auth-config"),
  openAuthWindow: (url: string) => ipcRenderer.invoke("auth-open-window", url),
  closeAuthWindow: () => ipcRenderer.invoke("auth-close-window"),
  fetchUserInfo: (url: string, accessToken: string) =>
    ipcRenderer.invoke(IpcChannels.FETCH_USER_INFO, { url, accessToken }),
  onAuthCallback: (callback: Function) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on("auth-callback", subscription);
    return () => {
      ipcRenderer.removeListener("auth-callback", subscription);
    };
  },

  // API Server operations
  "api-server:get-all": () => ipcRenderer.invoke("api-server:get-all"),
  "api-server:save": (config: any) =>
    ipcRenderer.invoke("api-server:save", config),
  "api-server:delete": (serverId: string) =>
    ipcRenderer.invoke("api-server:delete", serverId),
  "api-server:start": (serverId: string) =>
    ipcRenderer.invoke("api-server:start", serverId),
  "api-server:stop": (serverId: string) =>
    ipcRenderer.invoke("api-server:stop", serverId),
  "api-server:get-status": (serverId: string) =>
    ipcRenderer.invoke("api-server:get-status", serverId),
  "api-server:test-endpoint": (
    serverId: string,
    endpointId: string,
    params?: any
  ) =>
    ipcRenderer.invoke(
      "api-server:test-endpoint",
      serverId,
      endpointId,
      params
    ),
  "api-server:generate-docs": (serverId: string) =>
    ipcRenderer.invoke("api-server:generate-docs", serverId),

  // Server code management
  selectDirectory: () => ipcRenderer.invoke(IpcChannels.SELECT_DIRECTORY),
  readServerCode: (serverId: string, fileName?: string) =>
    ipcRenderer.invoke(IpcChannels.READ_SERVER_CODE, serverId, fileName),
  writeServerCode: (serverId: string, fileName: string, content: string) =>
    ipcRenderer.invoke(
      IpcChannels.WRITE_SERVER_CODE,
      serverId,
      fileName,
      content
    ),
  getServerFiles: (serverId: string) =>
    ipcRenderer.invoke(IpcChannels.GET_SERVER_FILES, serverId),
  openServerFolder: (serverId: string) =>
    ipcRenderer.invoke(IpcChannels.OPEN_SERVER_FOLDER, serverId),

  // Generic invoke method for API servers
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),

  // Event listeners
  on: (channel: string, callback: Function) => {
    const subscription = (_: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

// Global type declaration for the window object
declare global {
  interface Window {
    electronAPI: typeof api;
  }
}
