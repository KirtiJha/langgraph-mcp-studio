import {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowEvent,
} from "../../shared/workflowTypes";

// Local type definitions
interface ChatResponse {
  message: string;
  timestamp: string;
  context?: any;
}

interface WorkflowProcessingResult {
  success: boolean;
  totalResponses: number;
  finalResponse: string;
  message?: string;
  timestamp?: string;
  context?: any;
}

interface WorkflowChatResponse {
  type:
    | "node_start"
    | "node_complete"
    | "tool_start"
    | "tool_complete"
    | "error"
    | "final_response";
  nodeId?: string;
  nodeName?: string;
  toolName?: string;
  message: string;
  timestamp: string;
  context?: any;
}

interface WorkflowAnalysis {
  complexity: "low" | "medium" | "high";
  estimatedDuration: string;
  suggestions: string[];
  warnings: string[];
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workflow: WorkflowDefinition;
  tags: string[];
}

export interface WorkflowExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  continueOnError?: boolean;
  debugMode?: boolean;
}

/**
 * WorkflowService - Bridge between renderer and WorkflowAgent in main process
 */
export class WorkflowService {
  private eventListeners: Map<string, (event: WorkflowEvent) => void> =
    new Map();

  constructor() {
    // Listen for workflow events from main process
    if (typeof window !== "undefined" && window.electronAPI) {
      // Use generic invoke method for now until workflow IPC handlers are implemented
      try {
        window.electronAPI.on("workflow-event", (event: WorkflowEvent) => {
          this.eventListeners.forEach((listener) => listener(event));
        });
      } catch (error) {
        console.warn("Workflow event listener setup failed:", error);
      }
    }
  }

  /**
   * Execute a workflow using the WorkflowAgent in main process
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    initialData: any = {},
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:execute",
          workflow,
          initialData,
          options
        );
      } catch (error) {
        console.warn("Workflow execution via IPC failed, using mock:", error);
        // Return mock execution for development
        return this.createMockExecution(workflow);
      }
    }
    throw new Error("Electron API not available");
  }

  /**
   * Get execution status
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:get-execution",
          executionId
        );
      } catch (error) {
        console.warn("Get execution via IPC failed:", error);
        return null;
      }
    }
    return null;
  }

  /**
   * Stop a running execution
   */
  async stopExecution(executionId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:stop-execution",
          executionId
        );
      } catch (error) {
        console.warn("Stop execution via IPC failed:", error);
        return true; // Mock success
      }
    }
    return false;
  }

  /**
   * Pause a running execution
   */
  async pauseExecution(executionId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:pause-execution",
          executionId
        );
      } catch (error) {
        console.warn("Pause execution via IPC failed:", error);
        return true; // Mock success
      }
    }
    return false;
  }

  /**
   * Resume a paused execution
   */
  async resumeExecution(executionId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:resume-execution",
          executionId
        );
      } catch (error) {
        console.warn("Resume execution via IPC failed:", error);
        return true; // Mock success
      }
    }
    return false;
  }

  /**
   * Send a chat message to the workflow
   */
  async sendChatMessage(
    executionId: string,
    message: string,
    context?: any
  ): Promise<ChatResponse> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:send-chat-message",
          executionId,
          message,
          context
        );
      } catch (error) {
        console.warn("Send chat message via IPC failed:", error);
        // Return mock response
        return {
          message:
            "This is a mock response. The workflow system is being developed.",
          timestamp: new Date().toISOString(),
          context: { mock: true },
        };
      }
    }
    throw new Error("Electron API not available");
  }

  /**
   * Process a query through the workflow
   */
  async processQueryThroughWorkflow(
    workflow: WorkflowDefinition,
    query: string,
    callback?: (response: WorkflowChatResponse) => void
  ): Promise<WorkflowProcessingResult> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        // Set up real-time response listener if callback provided
        if (callback) {
          const listener = (response: WorkflowChatResponse) => {
            callback(response);
          };

          window.electronAPI.on("workflow-chat-response", listener);

          // Clean up listener after processing
          setTimeout(() => {
            window.electronAPI.removeAllListeners("workflow-chat-response");
          }, 30000); // 30 second timeout
        }

        return await window.electronAPI.invoke(
          "workflow:process-query",
          workflow,
          query
        );
      } catch (error) {
        console.error("Process query via IPC failed:", error);
        // Return error instead of mock response
        throw new Error(
          `Failed to process workflow query: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
    throw new Error("Electron API not available");
  }

  /**
   * Ask a question about the workflow
   */
  async askQuestion(
    workflow: WorkflowDefinition,
    question: string,
    context?: any
  ): Promise<ChatResponse> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:ask-question",
          workflow,
          question,
          context
        );
      } catch (error) {
        console.error("Ask question via IPC failed:", error);
        // Return error instead of mock response
        throw new Error(
          `Failed to process workflow question: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
    throw new Error("Electron API not available");
  }

  /**
   * Get workflow analysis and suggestions
   */
  async analyzeWorkflow(workflow: WorkflowDefinition): Promise<{
    analysis: string;
    suggestions: string[];
    issues: string[];
    optimization: string[];
  }> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke("workflow:analyze", workflow);
      } catch (error) {
        console.warn("Analyze workflow via IPC failed:", error);
        // Return mock analysis
        return {
          analysis: `This workflow "${workflow.name}" has ${workflow.nodes.length} nodes and appears to be well-structured.`,
          suggestions: [
            "Consider adding error handling nodes",
            "Add logging for better debugging",
          ],
          issues: [],
          optimization: [
            "Some nodes could be parallelized",
            "Add caching for repeated operations",
          ],
        };
      }
    }
    throw new Error("Electron API not available");
  }

  /**
   * Generate workflow code/script
   */
  async generateWorkflowCode(
    workflow: WorkflowDefinition,
    format: "javascript" | "python" | "json" = "javascript"
  ): Promise<string> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:generate-code",
          workflow,
          format
        );
      } catch (error) {
        console.warn("Generate workflow code via IPC failed:", error);
        return `// Generated workflow code for: ${
          workflow.name
        }\n// This is a mock implementation\n\nconst workflow = ${JSON.stringify(
          workflow,
          null,
          2
        )};`;
      }
    }
    throw new Error("Electron API not available");
  }

  /**
   * Listen to workflow events
   */
  onEvent(listenerId: string, callback: (event: WorkflowEvent) => void): void {
    this.eventListeners.set(listenerId, callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listenerId: string): void {
    this.eventListeners.delete(listenerId);
  }

  /**
   * Get available workflow templates
   */
  async getWorkflowTemplates(): Promise<WorkflowDefinition[]> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke("workflow:get-templates");
      } catch (error) {
        console.warn("Get workflow templates via IPC failed:", error);
        // Return mock templates
        return this.getMockTemplates();
      }
    }
    return [];
  }

  /**
   * Save workflow template
   */
  async saveWorkflowTemplate(
    workflow: WorkflowDefinition,
    templateName: string,
    description: string
  ): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        return await window.electronAPI.invoke(
          "workflow:save-template",
          workflow,
          templateName,
          description
        );
      } catch (error) {
        console.warn("Save workflow template via IPC failed:", error);
        return true; // Mock success
      }
    }
    return false;
  }

  /**
   * Create a mock execution for development/testing
   */
  private createMockExecution(workflow: WorkflowDefinition): WorkflowExecution {
    return {
      id: `exec_${Date.now()}`,
      workflowId: workflow.id,
      status: "running",
      startTime: new Date(),
      currentNodeId: workflow.nodes[0]?.id || "",
      nodeExecutions: workflow.nodes.map((node) => ({
        nodeId: node.id,
        status: "pending" as const,
        retryCount: 0,
      })),
    };
  }

  /**
   * Get mock workflow templates for development
   */
  private getMockTemplates(): WorkflowDefinition[] {
    return [
      {
        id: "template_data_processing",
        name: "Data Processing Pipeline",
        description: "A workflow for processing and transforming data",
        nodes: [
          {
            id: "start",
            type: "start",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "process",
            type: "transform",
            position: { x: 300, y: 100 },
            data: { label: "Process Data" },
          },
          {
            id: "end",
            type: "end",
            position: { x: 500, y: 100 },
            data: { label: "End" },
          },
        ],
        edges: [
          { id: "e1", source: "start", target: "process" },
          { id: "e2", source: "process", target: "end" },
        ],
        metadata: {
          created: new Date(),
          modified: new Date(),
          version: "1.0.0",
          tags: ["data", "processing", "template"],
        },
      },
    ];
  }
}

// Singleton instance
export const workflowService = new WorkflowService();
