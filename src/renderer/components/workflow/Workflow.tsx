import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  FolderOpenIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlayIcon,
  PencilIcon,
  BookmarkIcon,
  ShareIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

// Components
import WorkflowCanvas from "./WorkflowCanvas";
import CreateWorkflowModal from "./CreateWorkflowModal";
import WorkflowTemplatesModal from "./WorkflowTemplatesModal";
import WorkflowChat from "./WorkflowChat";

// Types
import {
  WorkflowDefinition,
  WorkflowExecution,
} from "../../../shared/workflowTypes";

// Services
import { workflowService } from "../../services/WorkflowService";

// Enhanced workflow execution using graph traversal principles from WorkflowAgent
async function executeWorkflowWithAgent(
  workflow: WorkflowDefinition,
  context: {
    workflowId: string;
    executionId: string;
    servers: any[];
    toolExecutor: (
      toolName: string,
      args: any,
      serverId: string
    ) => Promise<any>;
    onNodeStatusUpdate: (nodeId: string, status: string, data?: any) => void;
    onExecutionComplete: (
      status: "completed" | "error",
      error?: string
    ) => void;
  }
) {
  const { onNodeStatusUpdate, onExecutionComplete, toolExecutor, servers } =
    context;

  // Build adjacency list for graph traversal
  const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]));
  const adjacencyList = new Map<string, string[]>();
  const incomingEdges = new Map<string, string[]>();

  // Initialize adjacency lists
  workflow.nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
    incomingEdges.set(node.id, []);
  });

  // Build edge relationships
  workflow.edges.forEach((edge) => {
    adjacencyList.get(edge.source)?.push(edge.target);
    incomingEdges.get(edge.target)?.push(edge.source);
  });

  // Find start nodes (nodes with no incoming edges or explicit start type)
  const startNodes = workflow.nodes.filter(
    (node) =>
      node.type === "start" ||
      (incomingEdges.get(node.id)?.length === 0 && node.type !== "end")
  );

  if (startNodes.length === 0) {
    onExecutionComplete("error", "No start nodes found in workflow");
    return;
  }

  const executedNodes = new Set<string>();
  const currentlyExecuting = new Set<string>();
  const executionResults = new Map<string, any>();

  // Execute a single node
  async function executeNode(nodeId: string): Promise<boolean> {
    const node = nodeMap.get(nodeId);
    if (!node || executedNodes.has(nodeId) || currentlyExecuting.has(nodeId)) {
      return true;
    }

    currentlyExecuting.add(nodeId);
    onNodeStatusUpdate(nodeId, "running");

    const startTime = Date.now();

    try {
      let result: any = null;

      // Execute based on node type
      switch (node.type) {
        case "start":
          result = { type: "start", status: "completed" };
          break;

        case "end":
          result = { type: "end", status: "completed" };
          break;

        case "server":
          if (node.data.serverId) {
            const server = servers.find((s) => s.id === node.data.serverId);
            if (server && server.tools.length > 0) {
              // Execute the configured tool or first available tool
              const toolName = node.data.toolName || server.tools[0]?.name;
              if (toolName) {
                result = await toolExecutor(
                  toolName,
                  node.data.parameters || {},
                  node.data.serverId
                );
              }
            }
          }
          break;

        case "tool":
          if (node.data.toolName && node.data.serverId) {
            result = await toolExecutor(
              node.data.toolName,
              node.data.parameters || {},
              node.data.serverId
            );
          }
          break;

        case "conditional":
          // Simple condition evaluation - in real implementation this would be more sophisticated
          const condition = node.data.condition || "true";
          result = {
            condition,
            result: condition === "true" || condition.toString() === "true",
          };
          break;

        case "loop":
          // Simple loop execution - real implementation would handle iterations
          const iterations = node.data.maxIterations || 1;
          result = { type: "loop", iterations, status: "completed" };
          break;

        case "parallel":
          result = { type: "parallel", status: "completed" };
          break;

        case "transform":
          // Apply data transformation
          const transformScript = node.data.transformScript || "identity";
          result = {
            type: "transform",
            transformation: transformScript,
            status: "completed",
          };
          break;

        case "aggregator":
          // Aggregate results from previous nodes
          const previousResults = Array.from(incomingEdges.get(nodeId) || [])
            .map((sourceId) => executionResults.get(sourceId))
            .filter(Boolean);
          result = {
            type: "aggregator",
            inputs: previousResults,
            status: "completed",
          };
          break;

        default:
          result = { type: node.type, status: "completed" };
      }

      const duration = Date.now() - startTime;
      executionResults.set(nodeId, result);
      executedNodes.add(nodeId);
      currentlyExecuting.delete(nodeId);

      onNodeStatusUpdate(nodeId, "completed", { output: result, duration });
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      currentlyExecuting.delete(nodeId);

      onNodeStatusUpdate(nodeId, "error", {
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      });
      return false;
    }
  }

  // Check if all prerequisites for a node are completed
  function canExecuteNode(nodeId: string): boolean {
    const prerequisites = incomingEdges.get(nodeId) || [];
    return prerequisites.every((prereqId) => executedNodes.has(prereqId));
  }

  // Main execution loop with proper graph traversal
  const executionQueue = [...startNodes.map((n) => n.id)];

  while (executionQueue.length > 0) {
    const nodeId = executionQueue.shift()!;

    if (!canExecuteNode(nodeId)) {
      // Re-queue if prerequisites not met
      executionQueue.push(nodeId);
      continue;
    }

    const success = await executeNode(nodeId);

    if (!success) {
      onExecutionComplete("error", `Node ${nodeId} execution failed`);
      return;
    }

    // Add next nodes to queue
    const nextNodes = adjacencyList.get(nodeId) || [];
    for (const nextNodeId of nextNodes) {
      if (
        !executedNodes.has(nextNodeId) &&
        !executionQueue.includes(nextNodeId)
      ) {
        executionQueue.push(nextNodeId);
      }
    }
  }

  onExecutionComplete("completed");
}

interface WorkflowProps {
  tools: any[];
  servers: Array<{
    id: string;
    name: string;
    connected: boolean;
    tools: any[];
  }>;
  onExecuteTool?: (
    toolName: string,
    args: any,
    serverId: string
  ) => Promise<any>;
}

interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  lastModified: Date;
  nodeCount: number;
  tags: string[];
}

const Workflow: React.FC<WorkflowProps> = ({
  tools,
  servers,
  onExecuteTool,
}) => {
  // State
  const [currentWorkflow, setCurrentWorkflow] =
    useState<WorkflowDefinition | null>(null);
  const [chatWorkflow, setChatWorkflow] = useState<WorkflowDefinition | null>(
    null
  );
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showWorkflowChat, setShowWorkflowChat] = useState(false);

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  // Load workflows from storage
  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real app, this would load from storage/API
      const savedWorkflows = localStorage.getItem("workflows");
      if (savedWorkflows) {
        const parsed: any[] = JSON.parse(savedWorkflows).map((w: any) => ({
          ...w,
          // handle both string and Date
          lastModified: w.lastModified ? new Date(w.lastModified) : new Date(),
        }));
        setWorkflows(parsed);
      }
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save workflow
  const saveWorkflow = useCallback(
    async (workflow: WorkflowDefinition) => {
      try {
        // Save to storage
        const workflowData = JSON.stringify(workflow);
        localStorage.setItem(`workflow_${workflow.id}`, workflowData);

        // Update workflows list
        const listItem: WorkflowListItem = {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          lastModified: workflow.metadata.modified,
          nodeCount: workflow.nodes.length,
          tags: workflow.metadata.tags,
        };

        setWorkflows((prev) => {
          const existing = prev.find((w) => w.id === workflow.id);
          if (existing) {
            return prev.map((w) => (w.id === workflow.id ? listItem : w));
          } else {
            return [listItem, ...prev];
          }
        });

        // Update workflows list in storage
        const updatedWorkflowsForState = workflows.map((w) =>
          w.id === workflow.id ? listItem : w
        );
        if (!workflows.find((w) => w.id === workflow.id)) {
          updatedWorkflowsForState.unshift(listItem);
        }
        // update state
        setWorkflows(updatedWorkflowsForState);

        // serialize dates when saving
        const updatedWorkflowsForStorage = updatedWorkflowsForState.map(
          (w) => ({
            ...w,
            lastModified: (w.lastModified as Date).toISOString(),
          })
        );
        localStorage.setItem(
          "workflows",
          JSON.stringify(updatedWorkflowsForStorage)
        );

        console.log("Workflow saved successfully");
      } catch (error) {
        console.error("Failed to save workflow:", error);
      }
    },
    [workflows]
  );

  // Load workflow
  const loadWorkflow = useCallback(
    async (workflowId: string): Promise<WorkflowDefinition> => {
      try {
        const workflowData = localStorage.getItem(`workflow_${workflowId}`);
        if (workflowData) {
          return JSON.parse(workflowData);
        }
        throw new Error("Workflow not found");
      } catch (error) {
        console.error("Failed to load workflow:", error);
        throw error;
      }
    },
    []
  );

  // Create new workflow
  const createWorkflow = useCallback((name: string, description: string) => {
    const newWorkflow: WorkflowDefinition = {
      id: `workflow_${Date.now()}`,
      name,
      description,
      nodes: [
        {
          id: "start_1",
          type: "start",
          position: { x: 300, y: 100 },
          data: { label: "Start" },
        },
        {
          id: "end_1",
          type: "end",
          position: { x: 300, y: 400 },
          data: { label: "End" },
        },
      ],
      edges: [],
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: "1.0.0",
        tags: [],
      },
    };

    setCurrentWorkflow(newWorkflow);
    setShowCreateModal(false);
  }, []);

  // Execute workflow with WorkflowService
  const executeWorkflow = useCallback(async (workflow: WorkflowDefinition) => {
    try {
      setIsExecuting(true);
      console.log("Executing workflow via WorkflowService:", workflow.name);

      // Use WorkflowService to execute the workflow
      const execution = await workflowService.executeWorkflow(
        workflow,
        {},
        {
          debugMode: true,
          continueOnError: false,
        }
      );

      setExecution(execution);
      console.log("Workflow execution started:", execution);

      // Listen for workflow events
      const listenerId = `workflow_${workflow.id}_${Date.now()}`;
      workflowService.onEvent(listenerId, (event) => {
        console.log("Workflow event:", event);
        // Update execution state based on events
        if (event.type === "execution_completed") {
          setIsExecuting(false);
        } else if (event.type === "execution_error") {
          setIsExecuting(false);
          console.error("Workflow execution error:", event.data?.error);
        }
      });

      // Clean up listener after execution
      setTimeout(() => {
        workflowService.removeEventListener(listenerId);
      }, 30000); // Remove after 30 seconds
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      setIsExecuting(false);
      setExecution(null);
    }
  }, []);

  // Handle workflow selection
  const selectWorkflow = useCallback(
    async (workflowId: string) => {
      try {
        const workflow = await loadWorkflow(workflowId);
        setCurrentWorkflow(workflow);
      } catch (error) {
        console.error("Failed to load workflow:", error);
      }
    },
    [loadWorkflow]
  );

  // Handle workflow change
  const handleWorkflowChange = useCallback((workflow: WorkflowDefinition) => {
    setCurrentWorkflow(workflow);
  }, []);

  // Workflow chat handlers
  const handlePauseExecution = useCallback(async () => {
    if (execution) {
      const success = await workflowService.pauseExecution(execution.id);
      if (success) {
        setIsExecuting(false);
      }
    }
  }, [execution]);

  const handleResumeExecution = useCallback(async () => {
    if (execution) {
      const success = await workflowService.resumeExecution(execution.id);
      if (success) {
        setIsExecuting(true);
      }
    }
  }, [execution]);

  const handleStopExecution = useCallback(async () => {
    if (execution) {
      const success = await workflowService.stopExecution(execution.id);
      if (success) {
        setExecution(null);
        setIsExecuting(false);
      }
    }
  }, [execution]);

  // Filter workflows
  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || workflow.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Get all tags
  const allTags = Array.from(new Set(workflows.flatMap((w) => w.tags)));

  // Render workflow chat view
  if (showWorkflowChat) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        <WorkflowChat
          workflow={chatWorkflow || undefined}
          execution={execution || undefined}
          onExecuteWorkflow={executeWorkflow}
          onPauseExecution={handlePauseExecution}
          onResumeExecution={handleResumeExecution}
          onStopExecution={handleStopExecution}
          isExecuting={isExecuting}
          onClose={() => {
            setShowWorkflowChat(false);
            setChatWorkflow(null);
          }}
          onSelectWorkflow={async (workflow) => {
            // When selecting from chat, set it as the chat workflow
            // Load the full workflow definition when selected from chat
            try {
              const fullWorkflow = await loadWorkflow(workflow.id);
              setChatWorkflow(fullWorkflow);
            } catch (error) {
              console.error("Failed to load workflow from chat:", error);
              // Fallback to basic workflow definition
              setChatWorkflow(workflow);
            }
          }}
          availableWorkflows={workflows.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            nodes: [], // Will be loaded when selected
            edges: [],
            metadata: {
              created: w.lastModified,
              modified: w.lastModified,
              version: "1.0.0",
              tags: w.tags,
            },
          }))}
          className="flex-1"
        />
      </div>
    );
  }

  // Render workflow canvas view
  if (currentWorkflow) {
    return (
      <WorkflowCanvas
        workflow={currentWorkflow}
        servers={servers}
        onWorkflowChange={handleWorkflowChange}
        onExecuteWorkflow={executeWorkflow}
        onSaveWorkflow={saveWorkflow}
        onLoadWorkflow={loadWorkflow}
        execution={execution || undefined}
        isExecuting={isExecuting}
        onBackToWorkflows={() => setCurrentWorkflow(null)}
        onOpenChat={() => {
          setChatWorkflow(currentWorkflow);
          setShowWorkflowChat(true);
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 p-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-3">
              Workflow Designer
            </h2>
            <p className="text-slate-400 text-lg">
              Create visual workflows with your MCP servers and tools
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors duration-200 flex items-center space-x-2"
            >
              <BookmarkIcon className="w-4 h-4" />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setShowWorkflowChat(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>Workflow Chat</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Workflow</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Filter by tag"
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 text-sm text-slate-400">
          <span>{filteredWorkflows.length} workflows</span>
          <span>
            {servers.filter((s) => s.connected).length} connected servers
          </span>
          <span>{tools.length} available tools</span>
        </div>
      </div>

      {/* Workflow List */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center py-16">
            <AdjustmentsHorizontalIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              {workflows.length === 0
                ? "No workflows yet"
                : "No workflows match your search"}
            </h3>
            <p className="text-slate-500 mb-6">
              {workflows.length === 0
                ? "Create your first workflow to get started with visual automation"
                : "Try adjusting your search terms or filters"}
            </p>
            {workflows.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Create Your First Workflow</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6 hover:bg-slate-900/70 hover:border-slate-700 transition-all duration-200 cursor-pointer"
                onClick={() => selectWorkflow(workflow.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2">
                      {workflow.name}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {workflow.description || "No description"}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit
                      }}
                      className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Edit workflow"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle duplicate
                      }}
                      className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Duplicate workflow"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <span>{workflow.nodeCount} nodes</span>
                    <span>
                      Modified{" "}
                      {new Date(workflow.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {workflow.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {workflow.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {workflow.tags.length > 3 && (
                      <span className="px-2 py-1 bg-slate-600/20 text-slate-400 rounded text-xs">
                        +{workflow.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PlayIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-400">
                      Ready to execute
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectWorkflow(workflow.id);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium"
                  >
                    Open →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkflowModal
            onCreate={createWorkflow}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        {showTemplatesModal && (
          <WorkflowTemplatesModal
            onCreateFromTemplate={(template: WorkflowDefinition) => {
              console.log("Creating workflow from template:", template.name);
              // Create a new workflow based on the template
              const newWorkflow: WorkflowDefinition = {
                ...template,
                id: `workflow_${Date.now()}`,
                name: `${template.name} (Copy)`,
                metadata: {
                  ...template.metadata,
                  created: new Date(),
                  modified: new Date(),
                  version: "1.0.0",
                },
              };

              console.log("Setting new workflow:", newWorkflow);
              setCurrentWorkflow(newWorkflow);
              setShowTemplatesModal(false);
            }}
            onClose={() => setShowTemplatesModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Workflow;
