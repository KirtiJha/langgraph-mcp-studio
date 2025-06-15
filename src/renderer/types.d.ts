declare global {
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
      executeTool: (serverId: string, toolName: string, args: any) => Promise<any>;

      // Agent operations
      sendMessage: (message: string) => Promise<any>;

      // Resource operations
      listResources: (serverId: string) => Promise<any[]>;
      readResource: (serverId: string, uri: string) => Promise<any>;

      // Prompt operations
      listPrompts: (serverId: string) => Promise<any[]>;
      getPrompt: (serverId: string, name: string, args: any) => Promise<any>;

      // Context parameter discovery
      discoverContextParams: (serverId: string) => Promise<Record<string, string>>;

      // Event listeners
      on: (channel: string, callback: Function) => () => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
