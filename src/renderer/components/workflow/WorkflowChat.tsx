import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayIcon,
  StopIcon,
  EyeIcon,
  ArrowPathIcon,
  XMarkIcon,
  MinusIcon,
  SparklesIcon,
  PauseIcon,
} from "@heroicons/react/24/outline";
import {
  WorkflowDefinition,
  WorkflowExecution,
} from "../../../shared/workflowTypes";
import { WorkflowVisualization } from "./WorkflowVisualization";
import { WorkflowSelectionView } from "./WorkflowSelectionView";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { workflowService } from "../../services/WorkflowService";

interface WorkflowChatProps {
  workflow?: WorkflowDefinition;
  execution?: WorkflowExecution;
  onExecuteWorkflow?: (workflow: WorkflowDefinition) => Promise<void>;
  onPauseExecution?: () => void;
  onResumeExecution?: () => void;
  onStopExecution?: () => void;
  isExecuting?: boolean;
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onSelectWorkflow?: (workflow: WorkflowDefinition) => void;
  availableWorkflows?: WorkflowDefinition[];
}

export interface ChatMessage {
  id: string;
  type:
    | "user"
    | "assistant"
    | "system"
    | "workflow"
    | "tool-execution"
    | "node-status";
  content: string;
  timestamp: Date;
  workflowId?: string;
  nodeId?: string;
  executionId?: string;
  data?: any;
  toolCalls?: Array<{
    name: string;
    args: any;
    result?: any;
    status?: "executing" | "completed" | "failed" | "error";
    duration?: number;
    serverId?: string;
    error?: string;
  }>;
}

const WorkflowChat: React.FC<WorkflowChatProps> = ({
  workflow,
  execution,
  onExecuteWorkflow,
  onPauseExecution,
  onResumeExecution,
  onStopExecution,
  isExecuting = false,
  className = "",
  onClose,
  onMinimize,
  onSelectWorkflow,
  availableWorkflows = [],
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [isProcessingQuery, setIsProcessingQuery] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [executionPath, setExecutionPath] = useState<string[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<
    Record<string, "pending" | "executing" | "completed" | "error">
  >({});
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(
    new Set()
  );
  const [showVisualization, setShowVisualization] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (autoUpdate) {
      scrollToBottom();
    }
  }, [messages, autoUpdate, scrollToBottom]);

  // Listen for real-time workflow chat responses
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      const handleWorkflowChatResponse = (response: any) => {
        console.log("Workflow chat response received:", response);

        // Update node status based on response
        if (response.nodeId) {
          // Determine node status based on response flags
          let nodeStatus: "pending" | "executing" | "completed" | "error" =
            "executing";

          // Check if this is a completion message
          if (response.isNodeComplete === true) {
            nodeStatus = "completed";
            console.log(`Node ${response.nodeId} completed`);
          } else if (response.isNodeComplete === false) {
            // This is a start message
            nodeStatus = "executing";
            setActiveNodeId(response.nodeId);
            console.log(`Node ${response.nodeId} started executing`);
          }

          setNodeStatuses((prev) => ({
            ...prev,
            [response.nodeId]: nodeStatus,
          }));

          // Update execution path
          setExecutionPath((prev) => {
            if (!prev.includes(response.nodeId)) {
              return [...prev, response.nodeId];
            }
            return prev;
          });

          // Clear active node after completion
          if (response.isNodeComplete === true) {
            setTimeout(() => {
              setActiveNodeId((prev) => {
                if (prev === response.nodeId) {
                  return null;
                }
                return prev;
              });
            }, 1500);
          }
        }

        // Add the response as a chat message
        const chatMessage: ChatMessage = {
          id: `workflow-${response.nodeId || "unknown"}-${Date.now()}`,
          type: "assistant",
          content: response.message,
          timestamp: response.timestamp || new Date(),
          nodeId: response.nodeId,
          toolCalls: response.toolCalls,
        };

        setMessages((prev) => [...prev, chatMessage]);

        // If entire workflow is complete, clear active node
        if (response.isComplete === true) {
          setTimeout(() => {
            setActiveNodeId(null);
            console.log("Workflow completed - cleared active node");
          }, 1000);
        }
      };

      window.electronAPI.on(
        "workflow-chat-response",
        handleWorkflowChatResponse
      );

      return () => {
        window.electronAPI.removeAllListeners("workflow-chat-response");
      };
    }
  }, []);

  // Monitor workflow execution and add system messages
  useEffect(() => {
    if (!execution || !autoUpdate) return;

    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      type: "system",
      content: `Workflow execution ${execution.status}${
        execution.status === "running"
          ? ` - Currently executing: ${
              execution.currentNodeId || "Starting..."
            }`
          : execution.status === "completed"
          ? " - All nodes completed successfully"
          : execution.status === "error"
          ? ` - Error: ${execution.error}`
          : ""
      }`,
      timestamp: new Date(),
      executionId: execution.id,
      workflowId: execution.workflowId,
    };

    setMessages((prev) => {
      // Don't duplicate messages for the same execution state
      const lastMessage = prev[prev.length - 1];
      if (
        lastMessage?.executionId === execution.id &&
        lastMessage?.content.includes(execution.status)
      ) {
        return prev;
      }
      return [...prev, systemMessage];
    });
  }, [
    execution?.status,
    execution?.currentNodeId,
    execution?.error,
    autoUpdate,
  ]);

  // Monitor individual node executions
  useEffect(() => {
    if (!execution?.nodeExecutions || !autoUpdate) return;

    execution.nodeExecutions.forEach((nodeExecution) => {
      if (
        nodeExecution.status === "completed" ||
        nodeExecution.status === "error"
      ) {
        const nodeMessage: ChatMessage = {
          id: `node-${nodeExecution.nodeId}-${
            nodeExecution.status
          }-${Date.now()}`,
          type: "workflow",
          content: `Node "${getNodeName(nodeExecution.nodeId)}" ${
            nodeExecution.status
          }${nodeExecution.error ? `: ${nodeExecution.error}` : ""}${
            nodeExecution.duration ? ` (${nodeExecution.duration}ms)` : ""
          }`,
          timestamp: new Date(),
          nodeId: nodeExecution.nodeId,
          executionId: execution.id,
          workflowId: execution.workflowId,
          data: {
            output: nodeExecution.output,
            duration: nodeExecution.duration,
            status: nodeExecution.status,
          },
        };

        setMessages((prev) => {
          // Check if we already have a message for this node completion
          const existingMessage = prev.find(
            (m) =>
              m.nodeId === nodeExecution.nodeId &&
              m.data?.status === nodeExecution.status
          );

          if (existingMessage) return prev;
          return [...prev, nodeMessage];
        });
      }
    });
  }, [execution?.nodeExecutions, autoUpdate]);

  const getNodeName = useCallback(
    (nodeId: string) => {
      if (!workflow) return nodeId;
      const node = workflow.nodes.find((n) => n.id === nodeId);
      return node?.data?.label || node?.type || nodeId;
    },
    [workflow]
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !workflow) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const query = inputValue.trim();
    setInputValue("");
    setIsTyping(true);
    setIsProcessingQuery(true);

    try {
      // Check for workflow control commands first
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes("execute") || lowerQuery.includes("run")) {
        if (onExecuteWorkflow && !isExecuting) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            type: "assistant",
            content: `Starting workflow execution: "${workflow.name}"`,
            timestamp: new Date(),
            workflowId: workflow.id,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          await onExecuteWorkflow(workflow);
        } else if (isExecuting) {
          addAssistantMessage(
            "Workflow is already executing. Use 'pause' or 'stop' to control execution."
          );
        }
        return;
      }

      if (lowerQuery.includes("pause") && isExecuting) {
        onPauseExecution?.();
        addAssistantMessage("Pausing workflow execution...");
        return;
      }

      if (lowerQuery.includes("resume") && execution?.status === "paused") {
        onResumeExecution?.();
        addAssistantMessage("Resuming workflow execution...");
        return;
      }

      if (lowerQuery.includes("stop") && isExecuting) {
        onStopExecution?.();
        addAssistantMessage("Stopping workflow execution...");
        return;
      }

      if (lowerQuery.includes("status")) {
        if (execution) {
          const statusMessage = `Workflow Status: ${execution.status}
${
  execution.currentNodeId
    ? `Current Node: ${getNodeName(execution.currentNodeId)}`
    : ""
}
Nodes Executed: ${
            execution.nodeExecutions?.filter((ne) => ne.status === "completed")
              .length || 0
          }/${execution.nodeExecutions?.length || 0}
${
  execution.startTime
    ? `Started: ${execution.startTime.toLocaleTimeString()}`
    : ""
}
${
  execution.endTime
    ? `Completed: ${execution.endTime.toLocaleTimeString()}`
    : ""
}`;
          addAssistantMessage(statusMessage);
        } else {
          addAssistantMessage("No active workflow execution.");
        }
        return;
      }

      if (lowerQuery.includes("help")) {
        const helpMessage = `Available commands:
• "execute" or "run" - Start workflow execution
• "pause" - Pause current execution
• "resume" - Resume paused execution  
• "stop" - Stop current execution
• "status" - Get execution status
• "help" - Show this help message

You can also ask questions or provide queries that will be processed through the workflow nodes intelligently.`;
        addAssistantMessage(helpMessage);
        return;
      }

      // Process query through workflow using WorkflowService
      addAssistantMessage(
        `Processing your query "${query}" through workflow "${workflow.name}"...`
      );

      // Start intelligent workflow execution with user query
      await processQueryThroughWorkflow(query, workflow);
    } catch (error) {
      addAssistantMessage(
        `Error: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`
      );
    } finally {
      setIsTyping(false);
      setIsProcessingQuery(false);
    }
  }, [
    inputValue,
    workflow,
    execution,
    isExecuting,
    onExecuteWorkflow,
    onPauseExecution,
    onResumeExecution,
    onStopExecution,
    getNodeName,
  ]);

  /**
   * Process user query through workflow nodes intelligently
   */
  const processQueryThroughWorkflow = useCallback(
    async (query: string, workflow: WorkflowDefinition) => {
      try {
        // Initialize all node statuses to pending
        const initialStatuses: Record<
          string,
          "pending" | "executing" | "completed" | "error"
        > = {};
        workflow.nodes.forEach((node) => {
          initialStatuses[node.id] = "pending";
        });
        setNodeStatuses(initialStatuses);
        setActiveNodeId(null);
        setExecutionPath([]);

        addAssistantMessage(`🚀 Starting workflow execution for: "${query}"`);

        // Use WorkflowAgent processing with real-time responses
        const result = await workflowService.processQueryThroughWorkflow(
          workflow,
          query,
          (response) => {
            // Real-time responses are handled by the global event listener
            // This callback provides additional processing if needed
          }
        );

        // The real-time responses are handled by the event listener above
        // This is just the final completion message
        addAssistantMessage(
          `✅ Workflow execution completed! Processed ${
            result.totalResponses || "multiple"
          } nodes.`
        );
      } catch (error) {
        console.error("Workflow processing failed:", error);

        // Clear active node on error
        setActiveNodeId(null);

        // Show proper error message
        addAssistantMessage(
          `❌ Workflow execution failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        // Suggest checking workflow configuration
        addAssistantMessage(
          "💡 Please check your workflow configuration and ensure all required tools and servers are properly set up."
        );
      }
    },
    []
  );

  const addAssistantMessage = useCallback((content: string) => {
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      type: "assistant",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const getExecutionControls = () => {
    if (!workflow) return null;

    return (
      <div className="flex items-center space-x-2">
        {!isExecuting && (
          <button
            onClick={() => onExecuteWorkflow?.(workflow)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm"
          >
            <PlayIcon className="w-4 h-4" />
            <span>Execute</span>
          </button>
        )}

        {isExecuting && execution?.status === "running" && (
          <>
            <button
              onClick={onPauseExecution}
              className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors text-sm"
            >
              <PauseIcon className="w-4 h-4" />
              <span>Pause</span>
            </button>
            <button
              onClick={onStopExecution}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              <StopIcon className="w-4 h-4" />
              <span>Stop</span>
            </button>
          </>
        )}

        {execution?.status === "paused" && (
          <button
            onClick={onResumeExecution}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
          >
            <PlayIcon className="w-4 h-4" />
            <span>Resume</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <SparklesIcon className="w-5 h-5 text-purple-400" />
              {isProcessingQuery && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-200">
              Workflow AI Assistant
            </h3>
          </div>

          {workflow && (
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <span>•</span>
              <span className="text-slate-300">{workflow.name}</span>
              {isProcessingQuery && (
                <>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-amber-400">AI Processing</span>
                  </div>
                </>
              )}
              {execution && !isProcessingQuery && (
                <>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        execution.status === "running"
                          ? "bg-blue-400 animate-pulse"
                          : execution.status === "completed"
                          ? "bg-emerald-400"
                          : execution.status === "error"
                          ? "bg-red-400"
                          : "bg-slate-400"
                      }`}
                    />
                    <span className="capitalize">{execution.status}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {getExecutionControls()}

          {workflow && (
            <button
              onClick={() => setShowVisualization(!showVisualization)}
              className={`p-2 rounded-lg transition-colors ${
                showVisualization
                  ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}
              title={`${
                showVisualization ? "Hide" : "Show"
              } workflow visualization`}
            >
              <EyeIcon className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`p-2 rounded-lg transition-colors ${
              autoUpdate
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
            title={`Auto-update ${autoUpdate ? "enabled" : "disabled"}`}
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>

          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
              title="Minimize"
            >
              <MinusIcon className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!workflow ? (
        <WorkflowSelectionView
          availableWorkflows={availableWorkflows}
          onSelectWorkflow={onSelectWorkflow}
          onClose={onClose}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Workflow Visualization Panel */}
          {showVisualization && (
            <div className="w-1/2 border-r border-slate-800 bg-slate-950">
              <WorkflowVisualization
                workflow={workflow}
                activeNodeId={activeNodeId || undefined}
                nodeStatuses={nodeStatuses}
                executionPath={executionPath}
              />
            </div>
          )}

          {/* Chat Panel */}
          <div
            className={`${
              showVisualization ? "w-1/2" : "w-full"
            } flex flex-col bg-slate-900/30`}
          >
            <ChatMessages
              messages={messages}
              isTyping={isTyping}
              expandedToolCalls={expandedToolCalls}
              setExpandedToolCalls={setExpandedToolCalls}
              messagesEndRef={messagesEndRef}
            />

            <ChatInput
              inputValue={inputValue}
              setInputValue={setInputValue}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              isProcessingQuery={isProcessingQuery}
              isTyping={isTyping}
              inputRef={inputRef}
              messagesCount={messages.length}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowChat;
