import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Node,
  Edge,
  Position,
  ConnectionLineType,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CogIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  StopIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { WorkflowDefinition } from "../../../shared/workflowTypes";

interface WorkflowVisualizationProps {
  workflow: WorkflowDefinition;
  activeNodeId?: string;
  nodeStatuses: Record<string, "pending" | "executing" | "completed" | "error">;
  executionPath: string[];
}

const nodeIcons = {
  start: PlayIcon,
  end: StopIcon,
  server: ServerIcon,
  tool: WrenchScrewdriverIcon,
  conditional: QuestionMarkCircleIcon,
  loop: ArrowPathIcon,
  transform: CommandLineIcon,
  parallel: CogIcon,
  aggregator: CogIcon,
  default: CogIcon,
};

const statusColors = {
  pending: "bg-slate-600 border-slate-500",
  executing: "bg-blue-600 border-blue-400 shadow-blue-400/50",
  completed: "bg-emerald-600 border-emerald-400 shadow-emerald-400/50",
  error: "bg-red-600 border-red-400 shadow-red-400/50",
};

const statusIconColors = {
  pending: "text-slate-400",
  executing: "text-blue-200",
  completed: "text-emerald-200",
  error: "text-red-200",
};

export const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({
  workflow,
  activeNodeId,
  nodeStatuses,
  executionPath,
}) => {
  // Calculate auto-position for nodes without explicit positions
  const calculateAutoPosition = (node: any, nodes: any[], index: number) => {
    if (node.position) return node.position;

    // Simple auto-layout: arrange in a flow from left to right
    const nodeSpacing = 250;
    const levelSpacing = 150;

    // Try to determine node level based on type
    let level = 0;
    if (node.type === "start") level = 0;
    else if (node.type === "end") level = 3;
    else if (node.type === "server" || node.type === "tool") level = 1;
    else if (node.type === "conditional" || node.type === "transform")
      level = 2;
    else level = Math.floor(index / 3); // Fallback

    const nodesAtLevel = nodes.filter((n) => {
      if (n.type === "start") return level === 0;
      if (n.type === "end") return level === 3;
      if (n.type === "server" || n.type === "tool") return level === 1;
      if (n.type === "conditional" || n.type === "transform")
        return level === 2;
      return Math.floor(nodes.indexOf(n) / 3) === level;
    });

    const indexAtLevel = nodesAtLevel.indexOf(node);

    return {
      x: level * nodeSpacing,
      y: indexAtLevel * levelSpacing + 50,
    };
  };

  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = workflow.nodes.map((node, index) => {
      const status = nodeStatuses[node.id] || "pending";
      const isActive = activeNodeId === node.id;
      const isInPath = executionPath.includes(node.id);

      const IconComponent =
        nodeIcons[node.type as keyof typeof nodeIcons] || nodeIcons.default;

      return {
        id: node.id,
        type: "default",
        position: calculateAutoPosition(node, workflow.nodes, index),
        data: {
          label: (
            <motion.div
              animate={{
                scale: isActive ? 1.05 : 1,
                boxShadow: isActive
                  ? "0 0 20px rgba(168, 85, 247, 0.4)"
                  : "0 0 0px rgba(0, 0, 0, 0)",
              }}
              className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                statusColors[status]
              } ${isInPath ? "ring-2 ring-purple-400 ring-opacity-50" : ""}`}
            >
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <IconComponent
                    className={`w-5 h-5 ${statusIconColors[status]}`}
                  />
                  {status === "executing" && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0"
                    >
                      <div className="w-5 h-5 border-2 border-transparent border-t-blue-300 rounded-full" />
                    </motion.div>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">
                    {node.data.label || node.id}
                  </div>
                  <div className="text-xs text-slate-200 opacity-75">
                    {node.type}
                    {node.data.serverName && ` (${node.data.serverName})`}
                    {node.data.toolName && ` (${node.data.toolName})`}
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div className="mt-2 flex items-center justify-between">
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    status === "pending"
                      ? "bg-slate-700 text-slate-300"
                      : status === "executing"
                      ? "bg-blue-700 text-blue-200"
                      : status === "completed"
                      ? "bg-emerald-700 text-emerald-200"
                      : "bg-red-700 text-red-200"
                  }`}
                >
                  {status === "pending" && (
                    <ClockIcon className="w-3 h-3 inline mr-1" />
                  )}
                  {status === "executing" && (
                    <PlayIcon className="w-3 h-3 inline mr-1" />
                  )}
                  {status === "completed" && (
                    <CheckCircleIcon className="w-3 h-3 inline mr-1" />
                  )}
                  {status === "error" && (
                    <XCircleIcon className="w-3 h-3 inline mr-1" />
                  )}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>

                {isActive && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                )}
              </div>

              {/* Additional node info */}
              {node.data.description && (
                <div className="mt-2 text-xs text-slate-300 opacity-75 max-w-32 truncate">
                  {node.data.description}
                </div>
              )}
            </motion.div>
          ),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Generate edges from workflow definition or create default connections if none exist
    let edgesToRender = workflow.edges;

    // If no edges are defined, create a simple sequential flow
    if (!edgesToRender || edgesToRender.length === 0) {
      edgesToRender = [];
      const nodes = workflow.nodes;

      // Find start node
      const startNode = nodes.find((n) => n.type === "start");
      // Find end node
      const endNode = nodes.find((n) => n.type === "end");
      // Find other nodes
      const otherNodes = nodes.filter(
        (n) => n.type !== "start" && n.type !== "end"
      );

      if (startNode && otherNodes.length > 0) {
        // Connect start to first other node
        edgesToRender.push({
          id: `edge-${startNode.id}-${otherNodes[0].id}`,
          source: startNode.id,
          target: otherNodes[0].id,
          data: { label: "start" },
        });
      }

      // Connect other nodes sequentially
      for (let i = 0; i < otherNodes.length - 1; i++) {
        edgesToRender.push({
          id: `edge-${otherNodes[i].id}-${otherNodes[i + 1].id}`,
          source: otherNodes[i].id,
          target: otherNodes[i + 1].id,
          data: { label: "next" },
        });
      }

      // Connect last other node to end node
      if (otherNodes.length > 0 && endNode) {
        edgesToRender.push({
          id: `edge-${otherNodes[otherNodes.length - 1].id}-${endNode.id}`,
          source: otherNodes[otherNodes.length - 1].id,
          target: endNode.id,
          data: { label: "end" },
        });
      }

      console.log("Generated default edges:", edgesToRender);
    }

    const flowEdges: Edge[] = edgesToRender.map((edge) => {
      const sourceStatus = nodeStatuses[edge.source] || "pending";
      const targetStatus = nodeStatuses[edge.target] || "pending";
      const isPathEdge =
        executionPath.includes(edge.source) &&
        executionPath.includes(edge.target);

      // Check if this edge is currently being traversed
      const sourceIndex = executionPath.indexOf(edge.source);
      const targetIndex = executionPath.indexOf(edge.target);
      const isCurrentlyTraversing =
        sourceIndex >= 0 &&
        targetIndex >= 0 &&
        targetIndex === sourceIndex + 1 &&
        sourceStatus === "completed" &&
        targetStatus === "executing";

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.data?.label || edge.data?.condition,
        type: "smoothstep",
        animated:
          isCurrentlyTraversing ||
          (sourceStatus === "executing" && targetStatus === "executing"),
        style: {
          stroke: isCurrentlyTraversing
            ? "#fbbf24" // Yellow for active traversal
            : isPathEdge
            ? "#a855f7" // Purple for completed path
            : sourceStatus === "completed"
            ? "#10b981" // Green for completed source
            : "#e2e8f0", // Light gray for better visibility against dark background
          strokeWidth: isCurrentlyTraversing ? 5 : isPathEdge ? 4 : 3,
          opacity: 1, // Full opacity for maximum visibility
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: isCurrentlyTraversing
            ? "#fbbf24"
            : isPathEdge
            ? "#a855f7"
            : sourceStatus === "completed"
            ? "#10b981"
            : "#e2e8f0", // Light gray for better visibility
        },
      };
    });

    // Debug: Log edge information
    console.log("Workflow edges:", workflow.edges);
    console.log("Flow edges generated:", flowEdges);

    return { nodes: flowNodes, edges: flowEdges };
  }, [workflow, activeNodeId, nodeStatuses, executionPath]);

  return (
    <div className="h-full bg-slate-950 relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CogIcon className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium text-slate-200">
              Workflow Visualization
            </h4>
            {activeNodeId && (
              <div className="ml-4 flex items-center space-x-2">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-blue-400 rounded-full"
                />
                <span className="text-sm text-blue-300">
                  Executing:{" "}
                  {workflow.nodes.find((n) => n.id === activeNodeId)?.data
                    .label || activeNodeId}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {/* Execution Progress */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Progress:</span>
              <div className="flex items-center space-x-1">
                <span className="text-emerald-400">
                  {
                    Object.values(nodeStatuses).filter((s) => s === "completed")
                      .length
                  }
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{workflow.nodes.length}</span>
              </div>
            </div>

            {/* Status Legend */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-slate-600 rounded-full" />
                <span className="text-slate-400">Pending</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <span className="text-slate-400">Executing</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                <span className="text-slate-400">Completed</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-600 rounded-full" />
                <span className="text-slate-400">Error</span>
              </div>
            </div>

            {/* Debug Info */}
            <div className="text-xs text-slate-500">
              Edges: {edges.length} | Nodes: {nodes.length}
            </div>
          </div>
        </div>
      </div>

      {/* ReactFlow */}
      <div className="h-full pt-16">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
          minZoom={0.3}
          maxZoom={1.5}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
            style: {
              strokeWidth: 3,
              stroke: "#e2e8f0", // Light gray for better visibility
              opacity: 1,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#e2e8f0",
              width: 20,
              height: 20,
            },
          }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          className="bg-slate-950"
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null} // Disable delete key
          selectionKeyCode={null} // Disable selection
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#334155"
          />
          <MiniMap
            nodeColor="#475569"
            maskColor="rgba(15, 23, 42, 0.8)"
            className="!bg-slate-800 !border-slate-700"
          />
          <Controls
            className="!bg-slate-800 !border-slate-700 !text-slate-300"
            showInteractive={false}
          />
        </ReactFlow>
      </div>

      {/* Execution Summary */}
      {executionPath.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PlayIcon className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-200">Execution Path</span>
            </div>
            <div className="text-xs text-slate-400">
              {executionPath.length} / {workflow.nodes.length} nodes
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {executionPath.map((nodeId, index) => {
              const node = workflow.nodes.find((n) => n.id === nodeId);
              const status = nodeStatuses[nodeId] || "pending";

              return (
                <div
                  key={nodeId}
                  className={`px-2 py-1 rounded text-xs flex items-center space-x-1 ${
                    status === "completed"
                      ? "bg-emerald-600/20 text-emerald-300"
                      : status === "executing"
                      ? "bg-blue-600/20 text-blue-300"
                      : status === "error"
                      ? "bg-red-600/20 text-red-300"
                      : "bg-slate-600/20 text-slate-300"
                  }`}
                >
                  <span>{index + 1}.</span>
                  <span>{node?.data.label || nodeId}</span>
                  {status === "executing" && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-3 h-3"
                    >
                      <div className="w-3 h-3 border border-transparent border-t-blue-300 rounded-full" />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
