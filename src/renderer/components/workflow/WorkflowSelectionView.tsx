import React from "react";
import { motion } from "framer-motion";
import {
  CpuChipIcon,
  PlayIcon,
  SparklesIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { WorkflowDefinition } from "../../../shared/workflowTypes";

interface WorkflowSelectionViewProps {
  availableWorkflows: WorkflowDefinition[];
  onSelectWorkflow?: (workflow: WorkflowDefinition) => void;
  onClose?: () => void;
}

export const WorkflowSelectionView: React.FC<WorkflowSelectionViewProps> = ({
  availableWorkflows,
  onSelectWorkflow,
  onClose,
}) => {
  return (
    <div className="flex-1 p-6 min-h-[400px] overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-2xl mx-auto"
      >
        {/* Hero Section */}
        <div className="space-y-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <SparklesIcon className="w-16 h-16 text-purple-400 mx-auto" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-100">
              AI-Powered Workflow Assistant
            </h2>
            <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
              Choose a workflow to start an intelligent conversation. I'll help
              you execute, analyze, and optimize your processes.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <CpuChipIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-slate-200 mb-1">
                Smart Execution
              </h4>
              <p className="text-xs text-slate-400">
                Intelligent workflow processing with real-time feedback
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <SparklesIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-slate-200 mb-1">
                AI Analysis
              </h4>
              <p className="text-xs text-slate-400">
                Deep insights and optimization suggestions
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <RocketLaunchIcon className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-slate-200 mb-1">
                Interactive Control
              </h4>
              <p className="text-xs text-slate-400">
                Natural language commands and visual feedback
              </p>
            </motion.div>
          </div>
        </div>

        {/* Workflow Selection */}
        {availableWorkflows.length > 0 ? (
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                Available Workflows
              </h3>
              <p className="text-sm text-slate-400">
                Select a workflow to begin intelligent processing and get
                AI-powered assistance.
              </p>
            </div>

            <div className="grid gap-3 max-h-[400px] overflow-y-auto">
              {availableWorkflows.map((workflow, index) => (
                <motion.button
                  key={workflow.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectWorkflow?.(workflow)}
                  className="w-full p-4 text-left bg-gradient-to-r from-slate-800/80 to-slate-700/80 hover:from-slate-700/80 hover:to-slate-600/80 border border-slate-600 hover:border-slate-500 rounded-xl transition-all duration-300 group backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                          {workflow.name}
                        </h4>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                        >
                          AI Ready
                        </motion.div>
                      </div>

                      <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-2">
                        {workflow.description ||
                          "An intelligent workflow ready for AI-powered execution and analysis."}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-slate-500 group-hover:text-slate-400">
                        <div className="flex items-center space-x-1">
                          <CpuChipIcon className="w-3 h-3" />
                          <span>{workflow.nodes.length} nodes</span>
                        </div>

                        {workflow.metadata?.tags &&
                          workflow.metadata.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <span>•</span>
                              <div className="flex space-x-1">
                                {workflow.metadata.tags
                                  .slice(0, 2)
                                  .map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                {workflow.metadata.tags.length > 2 && (
                                  <span className="text-slate-500">
                                    +{workflow.metadata.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                        <div className="flex items-center space-x-1">
                          <span>•</span>
                          <span>{workflow.edges.length} connections</span>
                        </div>
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0 ml-4"
                    >
                      <PlayIcon className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                    </motion.div>
                  </div>

                  {/* Quick Preview */}
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">
                      Quick Preview:
                    </div>
                    <div className="flex items-center space-x-1">
                      {workflow.nodes.slice(0, 4).map((node, nodeIndex) => (
                        <React.Fragment key={node.id}>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              node.type === "start"
                                ? "bg-emerald-400"
                                : node.type === "end"
                                ? "bg-red-400"
                                : node.type === "server"
                                ? "bg-blue-400"
                                : node.type === "tool"
                                ? "bg-purple-400"
                                : "bg-slate-400"
                            }`}
                          />
                          {nodeIndex <
                            Math.min(workflow.nodes.length - 1, 3) && (
                            <div className="w-3 h-px bg-slate-600" />
                          )}
                        </React.Fragment>
                      ))}
                      {workflow.nodes.length > 4 && (
                        <>
                          <span className="text-slate-500 text-xs">...</span>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              workflow.nodes[workflow.nodes.length - 1].type ===
                              "end"
                                ? "bg-red-400"
                                : "bg-slate-400"
                            }`}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center space-y-4 py-8"
          >
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
              <CpuChipIcon className="w-12 h-12 text-slate-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium text-slate-300">
                No Workflows Available
              </h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Create your first workflow to start using the AI assistant.
                You'll be able to chat, execute, and optimize your processes.
              </p>
            </div>

            {onClose && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-purple-500/25"
              >
                Create Your First Workflow
              </motion.button>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
