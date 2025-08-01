import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ForwardIcon,
  EyeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface ExecutionPanelProps {
  execution: any;
  workflow: any;
  onClose: () => void;
  onStepThrough?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  execution,
  workflow,
  onClose,
  onStepThrough,
  onPause,
  onResume,
  onStop,
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);

  // Update execution history when execution changes
  useEffect(() => {
    if (execution?.nodeExecutions) {
      const completedExecutions = execution.nodeExecutions
        .filter((ne: any) => ne.status === "completed" || ne.status === "error")
        .sort(
          (a: any, b: any) =>
            (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0)
        );
      setExecutionHistory(completedExecutions);
    }
  }, [execution?.nodeExecutions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return (
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
        );
      case "completed":
        return <CheckCircleIcon className="w-4 h-4 text-emerald-400" />;
      case "error":
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-3 h-3 bg-slate-500 rounded-full" />;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "-";
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getNodeName = (nodeId: string) => {
    const node = workflow?.nodes.find((n: any) => n.id === nodeId);
    return node?.data?.label || node?.type || nodeId;
  };

  return (
    <div className="h-full bg-slate-900/50 border-t border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-slate-200">
            Execution Monitor
          </h3>
          {execution?.status && (
            <div className="flex items-center space-x-2">
              {getStatusIcon(execution.status)}
              <span className="text-sm text-slate-400 capitalize">
                {execution.status}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Execution Controls */}
          {execution?.status === "running" && (
            <>
              {onStepThrough && (
                <button
                  onClick={onStepThrough}
                  className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                  title="Step through execution"
                >
                  <ForwardIcon className="w-4 h-4" />
                </button>
              )}
              {onPause && (
                <button
                  onClick={onPause}
                  className="p-2 text-slate-400 hover:text-yellow-400 transition-colors"
                  title="Pause execution"
                >
                  <PauseIcon className="w-4 h-4" />
                </button>
              )}
              {onStop && (
                <button
                  onClick={onStop}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  title="Stop execution"
                >
                  <StopIcon className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {execution?.status === "paused" && onResume && (
            <button
              onClick={onResume}
              className="p-2 text-slate-400 hover:text-green-400 transition-colors"
              title="Resume execution"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close execution panel"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Execution Overview */}
        <div className="p-4 border-b border-slate-800">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Start Time:</span>
              <div className="text-slate-200">
                {execution?.startTime?.toLocaleString() || "-"}
              </div>
            </div>
            {execution?.endTime && (
              <div>
                <span className="text-slate-400">End Time:</span>
                <div className="text-slate-200">
                  {execution.endTime.toLocaleString()}
                </div>
              </div>
            )}
            <div>
              <span className="text-slate-400">Total Duration:</span>
              <div className="text-slate-200">
                {execution?.endTime && execution?.startTime
                  ? formatDuration(
                      execution.endTime.getTime() -
                        execution.startTime.getTime()
                    )
                  : execution?.status === "running"
                  ? formatDuration(
                      Date.now() - (execution?.startTime?.getTime() || 0)
                    )
                  : "-"}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Nodes Executed:</span>
              <div className="text-slate-200">
                {execution?.nodeExecutions?.filter(
                  (ne: any) => ne.status === "completed"
                ).length || 0}{" "}
                / {execution?.nodeExecutions?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Execution History Toggle */}
        <div className="px-4 py-2 border-b border-slate-800">
          <button
            onClick={() => setShowExecutionHistory(!showExecutionHistory)}
            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showExecutionHistory ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
            <ClockIcon className="w-4 h-4" />
            <span>Execution History ({executionHistory.length})</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {showExecutionHistory ? (
            /* Execution History View */
            <div className="p-4 space-y-2">
              {executionHistory.map((nodeExecution: any, index: number) => (
                <motion.div
                  key={`${nodeExecution.nodeId}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(nodeExecution.status)}
                      <span className="text-sm font-medium text-slate-200">
                        {getNodeName(nodeExecution.nodeId)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <ClockIcon className="w-3 h-3" />
                      <span>{formatDuration(nodeExecution.duration)}</span>
                    </div>
                  </div>

                  {nodeExecution.output && (
                    <div className="mt-2 text-xs">
                      <span className="text-slate-400">Output:</span>
                      <pre className="mt-1 p-2 bg-slate-900/50 rounded text-slate-300 overflow-x-auto">
                        {JSON.stringify(nodeExecution.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {nodeExecution.error && (
                    <div className="mt-2 text-xs">
                      <span className="text-red-400">Error:</span>
                      <div className="mt-1 p-2 bg-red-900/20 border border-red-800/50 rounded text-red-300">
                        {nodeExecution.error}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {executionHistory.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No execution history available
                </div>
              )}
            </div>
          ) : (
            /* Current Node Executions View */
            <div className="p-4 space-y-2">
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center space-x-2">
                <EyeIcon className="w-4 h-4" />
                <span>Node Executions</span>
              </h4>

              {execution?.nodeExecutions?.map((nodeExecution: any) => (
                <motion.div
                  key={nodeExecution.nodeId}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedNode === nodeExecution.nodeId
                      ? "bg-slate-800/70 border-blue-500/50"
                      : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50"
                  } ${
                    nodeExecution.status === "running"
                      ? "ring-1 ring-blue-400/30"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedNode(
                      selectedNode === nodeExecution.nodeId
                        ? null
                        : nodeExecution.nodeId
                    )
                  }
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(nodeExecution.status)}
                      <span className="text-sm font-medium text-slate-200">
                        {getNodeName(nodeExecution.nodeId)}
                      </span>
                      {nodeExecution.status === "running" &&
                        execution?.currentNodeId === nodeExecution.nodeId && (
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                            Current
                          </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      {nodeExecution.duration && (
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>{formatDuration(nodeExecution.duration)}</span>
                        </div>
                      )}
                      <span className="capitalize">{nodeExecution.status}</span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedNode === nodeExecution.nodeId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {nodeExecution.startTime && (
                        <div className="text-xs">
                          <span className="text-slate-400">Started:</span>
                          <span className="ml-2 text-slate-300">
                            {nodeExecution.startTime.toLocaleTimeString()}
                          </span>
                        </div>
                      )}

                      {nodeExecution.endTime && (
                        <div className="text-xs">
                          <span className="text-slate-400">Completed:</span>
                          <span className="ml-2 text-slate-300">
                            {nodeExecution.endTime.toLocaleTimeString()}
                          </span>
                        </div>
                      )}

                      {nodeExecution.input && (
                        <div className="text-xs">
                          <span className="text-slate-400">Input:</span>
                          <pre className="mt-1 p-2 bg-slate-900/50 rounded text-slate-300 overflow-x-auto max-h-32">
                            {JSON.stringify(nodeExecution.input, null, 2)}
                          </pre>
                        </div>
                      )}

                      {nodeExecution.output && (
                        <div className="text-xs">
                          <span className="text-slate-400">Output:</span>
                          <pre className="mt-1 p-2 bg-slate-900/50 rounded text-slate-300 overflow-x-auto max-h-32">
                            {JSON.stringify(nodeExecution.output, null, 2)}
                          </pre>
                        </div>
                      )}

                      {nodeExecution.error && (
                        <div className="text-xs">
                          <span className="text-red-400">Error:</span>
                          <div className="mt-1 p-2 bg-red-900/20 border border-red-800/50 rounded text-red-300">
                            {nodeExecution.error}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}

              {(!execution?.nodeExecutions ||
                execution.nodeExecutions.length === 0) && (
                <div className="text-center py-8 text-slate-400">
                  No node executions to display
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionPanel;
