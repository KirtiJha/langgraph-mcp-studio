declare global {
  // Environment variables
  const __DEV__: boolean;
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
    }
  }

  interface Window {
    electronAPI: {
      // Server management
      addServer: (config: any) => Promise<any>;
      removeServer: (id: string) => Promise<void>;
      listServers: () => Promise<any[]>;
      getServerConfig: (id: string) => Promise<any>;
      updateServer: (id: string, config: any) => Promise<any>;
      connectServer: (id: string) => Promise<void>;
      disconnectServer: (id: string) => Promise<void>;

      // Tool operations
      listTools: (serverId?: string) => Promise<any[]>;
      executeTool: (
        serverId: string,
        toolName: string,
        args: any
      ) => Promise<any>;

      // Agent operations
      sendMessage: (params: {
        message: string;
        model?: string;
      }) => Promise<any>;
      clearChat: () => Promise<{ success: boolean }>;

      // Resource operations
      listResources: (serverId: string) => Promise<any[]>;
      readResource: (serverId: string, uri: string) => Promise<any>;

      // Prompt operations
      listPrompts: (serverId: string) => Promise<any[]>;
      getPrompt: (serverId: string, name: string, args: any) => Promise<any>;

      // Context parameter discovery
      discoverContextParams: (
        serverId: string
      ) => Promise<Record<string, string>>;

      // OAuth2 operations
      openOAuth2Url: (url: string) => Promise<boolean>;
      exchangeOAuth2Token: (config: any, callbackUrl: string) => Promise<any>;
      onOAuth2Callback: (callback: (url: string) => void) => () => void;

      // Authentication configuration
      getAuthConfig: () => any;

      // Shell operations (for OAuth2)
      shell?: {
        openExternal: (url: string) => Promise<void>;
      };

      // API Server operations
      "api-server:get-all": () => Promise<any[]>;
      "api-server:save": (config: any) => Promise<any>;
      "api-server:delete": (serverId: string) => Promise<boolean>;
      "api-server:start": (serverId: string) => Promise<any>;
      "api-server:stop": (serverId: string) => Promise<boolean>;
      "api-server:get-status": (serverId: string) => Promise<any>;
      "api-server:test-endpoint": (
        serverId: string,
        endpointId: string,
        params?: any
      ) => Promise<any>;

      // Server code management
      selectDirectory: () => Promise<string | null>;
      readServerCode: (serverId: string, fileName?: string) => Promise<string>;
      writeServerCode: (
        serverId: string,
        fileName: string,
        content: string
      ) => Promise<void>;
      getServerFiles: (serverId: string) => Promise<{
        exists: boolean;
        files: Array<{
          name: string;
          path: string;
          size: number;
          modified: Date;
          type: "file" | "directory";
        }>;
      }>;
      openServerFolder: (serverId: string) => Promise<void>;

      // Generic invoke method
      invoke: (channel: string, ...args: any[]) => Promise<any>;

      // Event listeners
      on: (channel: string, callback: Function) => () => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
