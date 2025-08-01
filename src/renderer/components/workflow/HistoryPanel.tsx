import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClockIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

interface HistoryPanelProps {
  historyInfo: {
    total: number;
    current: number;
    canUndo: boolean;
    canRedo: boolean;
    currentAction?: string;
    currentDescription?: string;
    undoAction?: string;
    redoAction?: string;
  };
  recentHistory: Array<{
    workflow: any;
    timestamp: Date;
    action: string;
    description: string;
    index: number;
    isCurrent: boolean;
  }>;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToState: (index: number) => void;
  onClearHistory: () => void;
  onClose: () => void;
  className?: string;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyInfo,
  recentHistory,
  onUndo,
  onRedo,
  onJumpToState,
  onClearHistory,
  onClose,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "add_node":
        return <div className="w-2 h-2 bg-emerald-400 rounded-full" />;
      case "delete_node":
        return <div className="w-2 h-2 bg-red-400 rounded-full" />;
      case "move_node":
        return <div className="w-2 h-2 bg-blue-400 rounded-full" />;
      case "add_edge":
        return <div className="w-2 h-2 bg-purple-400 rounded-full" />;
      case "delete_edge":
        return <div className="w-2 h-2 bg-orange-400 rounded-full" />;
      case "update_node":
        return <div className="w-2 h-2 bg-amber-400 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-slate-400 rounded-full" />;
    }
  };

  return (
    <div
      className={`bg-slate-900/95 border border-slate-700 rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
          <ClockIcon className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-slate-200">History</h3>
          <span className="text-sm text-slate-400">
            {historyInfo.current}/{historyInfo.total}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Undo/Redo Controls */}
          <button
            onClick={onUndo}
            disabled={!historyInfo.canUndo}
            className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              historyInfo.undoAction
                ? `Undo: ${historyInfo.undoAction}`
                : "Nothing to undo"
            }
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
          </button>

          <button
            onClick={onRedo}
            disabled={!historyInfo.canRedo}
            className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              historyInfo.redoAction
                ? `Redo: ${historyInfo.redoAction}`
                : "Nothing to redo"
            }
          >
            <ArrowUturnRightIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-600" />

          <button
            onClick={() => setShowConfirmClear(true)}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
            title="Clear history"
          >
            <TrashIcon className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close history panel"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Current State Info */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/30">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse" />
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Current: {historyInfo.currentDescription || "Unknown state"}
                  </div>
                  <div className="text-xs text-slate-400">
                    Action: {historyInfo.currentAction || "Unknown"}
                  </div>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="max-h-64 overflow-y-auto">
              {recentHistory.length > 0 ? (
                <div className="p-2 space-y-1">
                  {recentHistory.map((item) => (
                    <motion.div
                      key={item.index}
                      className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        item.isCurrent
                          ? "bg-indigo-500/20 border border-indigo-500/30"
                          : "bg-slate-800/30 hover:bg-slate-800/60 border border-transparent"
                      }`}
                      onClick={() =>
                        !item.isCurrent && onJumpToState(item.index)
                      }
                      whileHover={!item.isCurrent ? { scale: 1.02 } : {}}
                      whileTap={!item.isCurrent ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getActionIcon(item.action)}

                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium truncate ${
                                item.isCurrent
                                  ? "text-indigo-200"
                                  : "text-slate-200"
                              }`}
                            >
                              {item.description}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-slate-400">
                              <span>{formatTimeAgo(item.timestamp)}</span>
                              <span>•</span>
                              <span className="capitalize">
                                {item.action.replace(/_/g, " ")}
                              </span>
                              {item.isCurrent && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-400 font-medium">
                                    Current
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {!item.isCurrent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onJumpToState(item.index);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-200 transition-all"
                            title="Jump to this state"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div className="text-sm">No history available</div>
                  <div className="text-xs mt-1">
                    Make changes to start tracking history
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/20">
              <div className="text-xs text-slate-400">
                <div className="font-medium mb-1">Keyboard Shortcuts:</div>
                <div className="grid grid-cols-2 gap-1">
                  <div>⌘+Z: Undo</div>
                  <div>⌘+⇧+Z: Redo</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showConfirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowConfirmClear(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-600 rounded-lg p-6 m-4 max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <TrashIcon className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-slate-200">
                  Clear History
                </h3>
              </div>

              <p className="text-slate-300 mb-6">
                Are you sure you want to clear all workflow history? This action
                cannot be undone.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    onClearHistory();
                    setShowConfirmClear(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Clear History
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryPanel;
