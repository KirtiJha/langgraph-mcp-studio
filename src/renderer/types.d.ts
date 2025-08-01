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

      // Tool state management
      getToolStates: () => Promise<Record<string, boolean>>;
      setToolEnabled: (
        toolName: string,
        serverId: string,
        enabled: boolean
      ) => Promise<boolean>;
      toggleToolState: (toolName: string, serverId: string) => Promise<boolean>;

      // Agent operations
      sendMessage: ({
        message,
        model,
      }: {
        message: string;
        model?: string;
      }) => Promise<any>;
      sendWorkflowMessage: ({
        message,
        workflow,
        node,
        model,
      }: {
        message: string;
        workflow: any;
        node?: any;
        model?: string;
      }) => Promise<any>;
      clearChat: () => Promise<{ success: boolean }>;

      // Model management
      getModelConfigs: () => Promise<any[]>;
      saveModelConfig: (config: any) => Promise<{ success: boolean }>;
      deleteModelConfig: (configId: string) => Promise<{ success: boolean }>;
      setDefaultModel: (configId: string) => Promise<{ success: boolean }>;
      testModelConnection: (
        config: any
      ) => Promise<{ success: boolean; error?: string }>;
      getAvailableModels: () => Promise<any[]>;
      getOllamaModels: (baseURL?: string) => Promise<any[]>;

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
      openServerInVSCode: (serverId: string) => Promise<void>;

      // MCP Server generation
      generateMCPServer: (config: any) => Promise<any>;

      // Workflow operations
      executeWorkflow: ({
        workflow,
        initialData,
        options,
      }: {
        workflow: any;
        initialData?: any;
        options?: any;
      }) => Promise<any>;
      clearWorkflowChat: () => Promise<any>;
      getWorkflowExecution: (executionId: string) => Promise<any>;
      stopWorkflowExecution: (executionId: string) => Promise<boolean>;
      pauseWorkflowExecution: (executionId: string) => Promise<boolean>;
      resumeWorkflowExecution: (executionId: string) => Promise<boolean>;
      sendWorkflowChatMessage: (
        workflowId: string,
        message: string,
        executionId?: string
      ) => Promise<string>;
      askWorkflowQuestion: (
        workflow: any,
        question: string,
        context?: any
      ) => Promise<string>;
      analyzeWorkflow: (workflow: any) => Promise<{
        analysis: string;
        suggestions: string[];
        issues: string[];
        optimization: string[];
      }>;
      generateWorkflowCode: (
        workflow: any,
        format?: "javascript" | "python" | "json"
      ) => Promise<string>;
      getWorkflowTemplates: () => Promise<any[]>;
      saveWorkflowTemplate: (
        workflow: any,
        templateName: string,
        description: string
      ) => Promise<boolean>;
      onWorkflowEvent: (callback: (event: any) => void) => () => void;

      // Generic invoke method
      invoke: (channel: string, ...args: any[]) => Promise<any>;

      // Event listeners
      on: (channel: string, callback: Function) => () => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
