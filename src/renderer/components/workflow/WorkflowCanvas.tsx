import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel,
  SelectionMode,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./workflow-canvas.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayIcon,
  StopIcon,
  DocumentArrowDownIcon as SaveIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  Cog6ToothIcon,
  PlusIcon,
  ArrowPathIcon,
  BookmarkIcon,
  ShareIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

// Import custom node types
import ServerNode from "./nodes/ServerNode";
import ToolNode from "./nodes/ToolNode";
import ConditionalNode from "./nodes/ConditionalNode";
import LoopNode from "./nodes/LoopNode";
import StartEndNode from "./nodes/StartEndNode";
import ParallelNode from "./nodes/ParallelNode";
import AggregatorNode from "./nodes/AggregatorNode";
import TransformNode from "./nodes/TransformNode";

// Import panels and modals
import NodePalette from "./NodePalette";
import PropertyPanel from "./PropertyPanel";
import WorkflowToolbar from "./WorkflowToolbar";
import ExecutionPanel from "./ExecutionPanel";
import WorkflowSettingsModal from "./WorkflowSettingsModal";

// Types
import {
  WorkflowDefinition,
  WorkflowNode as WFNode,
  WorkflowEdge,
  WorkflowExecution,
  NodeExecution,
} from "../../../shared/workflowTypes";

interface WorkflowCanvasProps {
  workflow: WorkflowDefinition | null;
  servers: Array<{
    id: string;
    name: string;
    connected: boolean;
    tools: any[];
  }>;
  onWorkflowChange?: (workflow: WorkflowDefinition) => void;
  onExecuteWorkflow?: (workflow: WorkflowDefinition) => Promise<void>;
  onSaveWorkflow?: (workflow: WorkflowDefinition) => Promise<void>;
  onLoadWorkflow?: (workflowId: string) => Promise<WorkflowDefinition>;
  execution?: WorkflowExecution;
  isExecuting?: boolean;
  className?: string;
  onBackToWorkflows?: () => void;
  onOpenChat?: () => void;
}

// Custom node types mapping
const nodeTypes = {
  server: ServerNode,
  tool: ToolNode,
  conditional: ConditionalNode,
  loop: LoopNode,
  start: StartEndNode,
  end: StartEndNode,
  parallel: ParallelNode,
  aggregator: AggregatorNode,
  transform: TransformNode,
};

// Custom edge styles
const edgeOptions = {
  animated: false,
  style: {
    stroke: "#64748b",
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#64748b",
    width: 20,
    height: 20,
  },
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  servers,
  onWorkflowChange,
  onExecuteWorkflow,
  onSaveWorkflow,
  onLoadWorkflow,
  execution,
  isExecuting = false,
  className = "",
  onBackToWorkflows,
  onOpenChat,
}) => {
  // States
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Convert workflow to ReactFlow format
  const convertWorkflowToFlow = useCallback(
    (wf: WorkflowDefinition) => {
      const flowNodes: Node[] = wf.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          servers: servers,
          isExecuting:
            execution?.nodeExecutions.find((ne) => ne.nodeId === node.id)
              ?.status === "running",
          executionStatus: execution?.nodeExecutions.find(
            (ne) => ne.nodeId === node.id
          )?.status,
          executionResult: execution?.nodeExecutions.find(
            (ne) => ne.nodeId === node.id
          )?.output,
          executionError: execution?.nodeExecutions.find(
            (ne) => ne.nodeId === node.id
          )?.error,
        },
        selected: selectedNode?.id === node.id,
      }));

      const flowEdges: Edge[] = wf.edges.map((edge) => {
        const isAnimated =
          execution?.status === "running" &&
          execution?.nodeExecutions.some(
            (ne) =>
              (ne.nodeId === edge.source && ne.status === "completed") ||
              (ne.nodeId === edge.target && ne.status === "running")
          );

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || "default",
          data: edge.data,
          animated: isAnimated,
          style: {
            stroke: execution?.status === "running" ? "#3b82f6" : "#64748b",
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: execution?.status === "running" ? "#3b82f6" : "#64748b",
            width: 20,
            height: 20,
          },
        };
      });

      return { nodes: flowNodes, edges: flowEdges };
    },
    [servers, execution, selectedNode]
  );

  // Update nodes and edges when workflow changes
  useEffect(() => {
    if (workflow) {
      const { nodes: flowNodes, edges: flowEdges } =
        convertWorkflowToFlow(workflow);
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [workflow, convertWorkflowToFlow, setNodes, setEdges]);

  // Convert ReactFlow format back to workflow
  const convertFlowToWorkflow = useCallback(
    (nodes: Node[], edges: Edge[]): WorkflowDefinition => {
      if (!workflow) {
        return {
          id: `workflow_${Date.now()}`,
          name: "New Workflow",
          description: "",
          nodes: [],
          edges: [],
          metadata: {
            created: new Date(),
            modified: new Date(),
            version: "1.0.0",
            tags: [],
          },
        };
      }

      const workflowNodes: WFNode[] = nodes.map((node) => ({
        id: node.id,
        type: node.type as any,
        position: node.position,
        data: {
          label: node.data.label as string,
          serverId: node.data.serverId as string,
          serverName: node.data.serverName as string,
          toolName: node.data.toolName as string,
          selectedTools: node.data.selectedTools as string[],
          condition: node.data.condition as string,
          conditionType: node.data.conditionType as
            | "javascript"
            | "simple"
            | "jq",
          parameters: node.data.parameters as Record<string, any>,
          loopCondition: node.data.loopCondition as string,
          maxIterations: node.data.maxIterations as number,
          transformScript: node.data.transformScript as string,
          description: node.data.description as string,
          timeout: node.data.timeout as number,
          retryCount: node.data.retryCount as number,
          continueOnError: node.data.continueOnError as boolean,
          parallelBranches: node.data.parallelBranches as string[],
          aggregationType: node.data.aggregationType as
            | "merge"
            | "array"
            | "first"
            | "last"
            | "custom",
          aggregationScript: node.data.aggregationScript as string,
        },
      }));

      const workflowEdges: WorkflowEdge[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type as any,
        data: edge.data,
      }));

      return {
        ...workflow,
        nodes: workflowNodes,
        edges: workflowEdges,
        metadata: {
          ...workflow.metadata,
          modified: new Date(),
        },
      };
    },
    [workflow]
  );

  // Handle connection creation
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `edge_${Date.now()}`,
        type: "default",
        animated: false,
        style: {
          stroke: "#64748b",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748b",
          width: 20,
          height: 20,
        },
      } as Edge;
      setEdges((eds) => addEdge(newEdge, eds));

      // Update workflow
      if (onWorkflowChange) {
        const updatedWorkflow = convertFlowToWorkflow(nodes, [
          ...edges,
          newEdge,
        ]);
        onWorkflowChange(updatedWorkflow);
      }
    },
    [nodes, edges, onWorkflowChange, convertFlowToWorkflow, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log("Node clicked:", node);
    setSelectedNode(node);
    setSelectedEdge(null);
    setShowPropertyPanel(true);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setShowPropertyPanel(true);
  }, []);

  // Handle node drag end
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onWorkflowChange) {
        const updatedNodes = nodes.map((n) => (n.id === node.id ? node : n));
        const updatedWorkflow = convertFlowToWorkflow(updatedNodes, edges);
        onWorkflowChange(updatedWorkflow);
      }
    },
    [nodes, edges, onWorkflowChange, convertFlowToWorkflow]
  );

  // Handle node deletion
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      if (onWorkflowChange) {
        const remainingNodes = nodes.filter(
          (n) => !deletedNodes.some((dn) => dn.id === n.id)
        );
        const remainingEdges = edges.filter(
          (e) =>
            !deletedNodes.some((dn) => dn.id === e.source || dn.id === e.target)
        );
        const updatedWorkflow = convertFlowToWorkflow(
          remainingNodes,
          remainingEdges
        );
        onWorkflowChange(updatedWorkflow);
      }
    },
    [nodes, edges, onWorkflowChange, convertFlowToWorkflow]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      if (onWorkflowChange) {
        const remainingEdges = edges.filter(
          (e) => !deletedEdges.some((de) => de.id === e.id)
        );
        const updatedWorkflow = convertFlowToWorkflow(nodes, remainingEdges);
        onWorkflowChange(updatedWorkflow);
      }
    },
    [nodes, edges, onWorkflowChange, convertFlowToWorkflow]
  );

  // Add new node from palette
  const onAddNode = useCallback(
    (
      nodeType: string,
      position: { x: number; y: number },
      initialData: Record<string, any> = {}
    ) => {
      const baseData = {
        label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`,
        servers: servers,
      };

      // Start with base
      let nodeData: any = { ...baseData };

      // Defaults per node type
      if (nodeType === "server") {
        nodeData = {
          ...nodeData,
          label: "MCP Server",
          serverId: "",
          serverName: "",
          selectedTools: [],
        };
      } else if (nodeType === "tool") {
        nodeData = {
          ...nodeData,
          label: "Tool",
          serverId: "",
          toolName: "",
          parameters: {},
        };
      } else if (nodeType === "conditional") {
        nodeData = {
          ...nodeData,
          label: "Conditional",
          condition: "",
          conditionType: "javascript",
        };
      } else if (nodeType === "loop") {
        nodeData = {
          ...nodeData,
          label: "Loop",
          loopCondition: "",
          maxIterations: 10,
        };
      } else if (nodeType === "transform") {
        nodeData = {
          ...nodeData,
          label: "Transform",
          transformScript: "",
        };
      } else if (nodeType === "aggregator") {
        nodeData = {
          ...nodeData,
          label: "Aggregator",
          aggregationType: "merge",
        };
      } else if (nodeType === "parallel") {
        nodeData = {
          ...nodeData,
          label: "Parallel",
          parallelBranches: [],
        };
      }

      // Finally merge any initialData so it overrides defaults
      nodeData = { ...nodeData, ...initialData };

      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: nodeType,
        position,
        data: nodeData,
      };

      setNodes((nds) => [...nds, newNode]);

      if (onWorkflowChange) {
        const updatedWorkflow = convertFlowToWorkflow(
          [...nodes, newNode],
          edges
        );
        onWorkflowChange(updatedWorkflow);
      }
    },
    [nodes, edges, onWorkflowChange, convertFlowToWorkflow, setNodes, servers]
  );

  // Update node data
  const onUpdateNodeData = useCallback(
    (nodeId: string, newData: any) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
        )
      );

      // If the updated node is currently selected, update selectedNode state too
      setSelectedNode((prev) =>
        prev && prev.id === nodeId
          ? { ...prev, data: { ...prev.data, ...newData } }
          : prev
      );

      if (onWorkflowChange) {
        const updatedNodes = nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
        );
        const updatedWorkflow = convertFlowToWorkflow(updatedNodes, edges);
        onWorkflowChange(updatedWorkflow);
      }
    },
    [nodes, edges, onWorkflowChange, convertFlowToWorkflow, setNodes]
  );

  // Execute workflow
  const handleExecuteWorkflow = useCallback(async () => {
    if (workflow && onExecuteWorkflow) {
      setShowExecutionPanel(true);
      await onExecuteWorkflow(workflow);
    }
  }, [workflow, onExecuteWorkflow]);

  // Save workflow
  const handleSaveWorkflow = useCallback(async () => {
    if (workflow && onSaveWorkflow) {
      const updatedWorkflow = convertFlowToWorkflow(nodes, edges);
      await onSaveWorkflow(updatedWorkflow);
    }
  }, [workflow, nodes, edges, onSaveWorkflow, convertFlowToWorkflow]);

  // Validate workflow
  const validateWorkflow = useCallback(() => {
    setIsValidating(true);
    const errors: any[] = [];

    // Check for start node
    const startNodes = nodes.filter((n) => n.type === "start");
    if (startNodes.length === 0) {
      errors.push({
        type: "workflow",
        message: "Workflow must have at least one start node",
      });
    }
    if (startNodes.length > 1) {
      errors.push({
        type: "workflow",
        message: "Workflow can only have one start node",
      });
    }

    // Check for end node
    const endNodes = nodes.filter((n) => n.type === "end");
    if (endNodes.length === 0) {
      errors.push({
        type: "workflow",
        message: "Workflow must have at least one end node",
      });
    }

    // Check for disconnected nodes
    nodes.forEach((node) => {
      if (node.type !== "start" && node.type !== "end") {
        const hasIncoming = edges.some((e) => e.target === node.id);
        const hasOutgoing = edges.some((e) => e.source === node.id);

        if (!hasIncoming && node.type !== "start") {
          errors.push({
            type: "node",
            nodeId: node.id,
            message: `Node "${node.data.label}" has no incoming connections`,
          });
        }
        if (!hasOutgoing && node.type !== "end") {
          errors.push({
            type: "node",
            nodeId: node.id,
            message: `Node "${node.data.label}" has no outgoing connections`,
          });
        }
      }
    });

    // Check for required node configuration
    nodes.forEach((node) => {
      if (node.type === "server" && !node.data.serverId) {
        errors.push({
          type: "node",
          nodeId: node.id,
          message: `Server node "${node.data.label}" must have a server selected`,
        });
      }
      if (
        node.type === "tool" &&
        (!node.data.serverId || !node.data.toolName)
      ) {
        errors.push({
          type: "node",
          nodeId: node.id,
          message: `Tool node "${node.data.label}" must have a server and tool selected`,
        });
      }
      if (node.type === "conditional" && !node.data.condition) {
        errors.push({
          type: "node",
          nodeId: node.id,
          message: `Conditional node "${node.data.label}" must have a condition defined`,
        });
      }
    });

    setValidationErrors(errors);
    setIsValidating(false);
    return errors.length === 0;
  }, [nodes, edges]);

  // Handle drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      console.log("Drop event triggered");

      let nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType) {
        nodeType = event.dataTransfer.getData("text/plain");
      }
      console.log("Node type from drag:", nodeType);

      if (typeof nodeType === "undefined" || !nodeType) {
        console.log("Invalid drop - missing nodeType");
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) {
        console.log("Invalid drop - missing reactFlowBounds");
        return;
      }

      let position;
      if (reactFlowInstance && reactFlowInstance.project) {
        position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
      } else {
        // Fallback positioning if project function is not available
        position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };
      }

      // read any initial data passed in drag payload
      let initialData: Record<string, any> = {};
      const initialDataStr = event.dataTransfer.getData(
        "application/initialData"
      );
      if (initialDataStr) {
        try {
          initialData = JSON.parse(initialDataStr);
        } catch (_) {
          console.warn("Failed to parse initialData payload");
        }
      }
      console.log("Adding node at position:", position, initialData);
      onAddNode(nodeType, position, initialData);
    },
    [reactFlowInstance, onAddNode]
  );

  if (!workflow) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Cog6ToothIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            No Workflow Selected
          </h3>
          <p className="text-slate-500">
            Create a new workflow or load an existing one to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col bg-slate-950 relative ${className}`}>
      {/* Toolbar */}
      <WorkflowToolbar
        workflow={workflow}
        isExecuting={isExecuting}
        validationErrors={validationErrors}
        onExecute={handleExecuteWorkflow}
        onSave={handleSaveWorkflow}
        onValidate={validateWorkflow}
        onShowSettings={() => setShowSettingsModal(true)}
        onTogglePalette={() => setShowPalette(!showPalette)}
        onToggleExecution={() => setShowExecutionPanel(!showExecutionPanel)}
      />

      <div className="flex-1 flex">
        {/* Node Palette */}
        <AnimatePresence>
          {showPalette && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              className="w-80 bg-slate-900/50 border-r border-slate-800"
            >
              <NodePalette
                servers={servers}
                onAddNode={onAddNode}
                reactFlowInstance={reactFlowInstance}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Canvas */}
        <div
          className="flex-1 relative workflow-canvas-container"
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{
              padding: 0.2,
              minZoom: 0.1,
              maxZoom: 4,
            }}
            minZoom={0.1}
            maxZoom={4}
            attributionPosition="bottom-left"
            className="bg-slate-950"
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode="Shift"
            deleteKeyCode={["Backspace", "Delete"]}
            connectionLineStyle={{ stroke: "#3b82f6", strokeWidth: 2 }}
            snapToGrid
            snapGrid={[15, 15]}
            panOnScroll={true}
            panOnScrollSpeed={0.5}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
          >
            <Background color="#1e293b" />
            <Controls
              position="bottom-left"
              showZoom={true}
              showFitView={true}
              showInteractive={true}
            />
            <MiniMap
              className="bg-slate-900 border border-slate-700"
              nodeColor="#475569"
              maskColor="rgba(0, 0, 0, 0.5)"
              position="bottom-right"
            />

            {/* Validation Errors Overlay */}
            {validationErrors.length > 0 && (
              <Panel
                position="top-right"
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
              >
                <div className="text-red-400 text-sm">
                  <div className="font-medium mb-2">
                    Validation Errors ({validationErrors.length})
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {validationErrors.slice(0, 3).map((error, index) => (
                      <div key={index} className="text-xs">
                        {error.message}
                      </div>
                    ))}
                    {validationErrors.length > 3 && (
                      <div className="text-xs opacity-75">
                        ...and {validationErrors.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            )}

            {/* Execution Status Overlay */}
            {isExecuting && (
              <Panel
                position="top-center"
                className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"
              >
                <div className="flex items-center space-x-2 text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">
                    Executing Workflow
                  </span>
                </div>
              </Panel>
            )}

            {/* Navigation Controls */}
            <Panel position="top-left" className="flex space-x-2">
              {/* Back to Workflows Button */}
              {onBackToWorkflows && (
                <button
                  onClick={onBackToWorkflows}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors duration-200 flex items-center space-x-2 border border-slate-600"
                  title="Back to Workflows"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span className="text-sm">Back</span>
                </button>
              )}

              {/* Open Chat Button */}
              {onOpenChat && (
                <button
                  onClick={onOpenChat}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  title="Open Workflow Chat"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  <span className="text-sm">Chat</span>
                </button>
              )}
            </Panel>
          </ReactFlow>
        </div>

        {/* Property Panel */}
        <AnimatePresence>
          {showPropertyPanel && (selectedNode || selectedEdge) && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-96 bg-slate-900/50 border-l border-slate-800"
            >
              <PropertyPanel
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                servers={servers}
                onUpdateNodeData={onUpdateNodeData}
                onClose={() => setShowPropertyPanel(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Execution Panel */}
      <AnimatePresence>
        {showExecutionPanel && execution && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            className="h-80 bg-slate-900/50 border-t border-slate-800"
          >
            <ExecutionPanel
              execution={execution}
              workflow={workflow}
              onClose={() => setShowExecutionPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettingsModal && (
        <WorkflowSettingsModal
          workflow={workflow}
          onSave={(updatedWorkflow) => {
            if (onWorkflowChange) {
              onWorkflowChange(updatedWorkflow);
            }
            setShowSettingsModal(false);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};

// Wrapped component with ReactFlowProvider
const WorkflowCanvasWrapper: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvasWrapper;
