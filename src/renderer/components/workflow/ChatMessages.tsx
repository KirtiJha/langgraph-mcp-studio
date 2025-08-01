import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CommandLineIcon,
  WrenchScrewdriverIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import { ChatMessage } from "./WorkflowChat";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  expandedToolCalls: Set<string>;
  setExpandedToolCalls: React.Dispatch<React.SetStateAction<Set<string>>>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const getMessageIcon = (type: string, data?: any) => {
  switch (type) {
    case "user":
      return <UserIcon className="w-4 h-4 text-blue-200" />;
    case "assistant":
      return <SparklesIcon className="w-4 h-4 text-purple-200" />;
    case "system":
      return <ExclamationTriangleIcon className="w-4 h-4 text-amber-200" />;
    case "tool-execution":
      return <CommandLineIcon className="w-4 h-4 text-emerald-200" />;
    case "node-status":
      const status = data?.status;
      if (status === "completed")
        return <CheckCircleIcon className="w-4 h-4 text-emerald-200" />;
      if (status === "error")
        return <XCircleIcon className="w-4 h-4 text-red-200" />;
      if (status === "executing")
        return <CpuChipIcon className="w-4 h-4 text-blue-200" />;
      return <ClockIcon className="w-4 h-4 text-slate-400" />;
    default:
      return <CpuChipIcon className="w-4 h-4 text-slate-400" />;
  }
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isTyping,
  expandedToolCalls,
  setExpandedToolCalls,
  messagesEndRef,
}) => {
  const toggleToolCallExpansion = (messageId: string, toolIndex: number) => {
    const key = `${messageId}-${toolIndex}`;
    const newExpanded = new Set(expandedToolCalls);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedToolCalls(newExpanded);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`flex space-x-3 ${
              message.type === "user" ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  message.type === "user"
                    ? "bg-blue-500/20 border border-blue-500/30"
                    : message.type === "assistant"
                    ? "bg-purple-500/20 border border-purple-500/30"
                    : message.type === "system"
                    ? "bg-amber-500/20 border border-amber-500/30"
                    : message.type === "tool-execution"
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : message.type === "node-status"
                    ? "bg-blue-500/20 border border-blue-500/30"
                    : "bg-slate-700 border border-slate-600"
                }`}
              >
                {getMessageIcon(message.type, message.data)}
              </div>
            </div>

            {/* Message Content */}
            <div
              className={`flex-1 ${
                message.type === "user" ? "text-right" : ""
              }`}
            >
              <div
                className={`inline-block rounded-xl max-w-[85%] ${
                  message.type === "user"
                    ? "bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 text-blue-100"
                    : message.type === "assistant"
                    ? "bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 text-purple-100"
                    : message.type === "system"
                    ? "bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-500/30 text-amber-100"
                    : message.type === "tool-execution"
                    ? "bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border border-emerald-500/30 text-emerald-100"
                    : message.type === "node-status"
                    ? "bg-gradient-to-br from-slate-600/20 to-slate-700/20 border border-slate-500/30 text-slate-200"
                    : "bg-slate-700/50 border border-slate-600 text-slate-200"
                }`}
              >
                {/* Main message content */}
                <div className="p-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>

                  {/* Node status details */}
                  {message.type === "node-status" && message.data && (
                    <div className="mt-3 pt-3 border-t border-slate-600/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Node: {message.data.nodeId}
                        </span>
                        <div
                          className={`px-2 py-1 rounded ${
                            message.data.status === "completed"
                              ? "bg-emerald-600/30 text-emerald-200"
                              : message.data.status === "error"
                              ? "bg-red-600/30 text-red-200"
                              : message.data.status === "executing"
                              ? "bg-blue-600/30 text-blue-200"
                              : "bg-slate-600/30 text-slate-300"
                          }`}
                        >
                          {message.data.status}
                        </div>
                      </div>
                      {message.data.duration && (
                        <div className="text-xs text-slate-400 mt-1">
                          Duration: {formatDuration(message.data.duration)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool execution details */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-2">
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <WrenchScrewdriverIcon className="w-3 h-3" />
                        <span>
                          Tool Executions ({message.toolCalls.length})
                        </span>
                      </div>

                      {message.toolCalls.map((toolCall, index) => {
                        const key = `${message.id}-${index}`;
                        const isExpanded = expandedToolCalls.has(key);

                        return (
                          <div
                            key={index}
                            className="bg-slate-800/30 rounded-lg border border-slate-600/50"
                          >
                            <button
                              onClick={() =>
                                toggleToolCallExpansion(message.id, index)
                              }
                              className="w-full p-3 text-left hover:bg-slate-700/30 transition-colors rounded-lg"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      toolCall.status === "completed"
                                        ? "bg-emerald-400"
                                        : toolCall.status === "error"
                                        ? "bg-red-400"
                                        : toolCall.status === "executing"
                                        ? "bg-blue-400 animate-pulse"
                                        : "bg-slate-400"
                                    }`}
                                  />
                                  <span className="text-sm font-medium">
                                    {toolCall.name}
                                  </span>
                                  {toolCall.serverId && (
                                    <span className="text-xs text-slate-400">
                                      ({toolCall.serverId})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2">
                                  {toolCall.duration && (
                                    <span className="text-xs text-slate-400">
                                      {formatDuration(toolCall.duration)}
                                    </span>
                                  )}
                                  {isExpanded ? (
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 space-y-2">
                                    {/* Arguments */}
                                    {toolCall.args &&
                                      Object.keys(toolCall.args).length > 0 && (
                                        <div>
                                          <div className="text-xs text-slate-400 mb-1">
                                            Arguments:
                                          </div>
                                          <pre className="text-xs bg-slate-900/50 rounded p-2 text-slate-300 overflow-x-auto">
                                            {JSON.stringify(
                                              toolCall.args,
                                              null,
                                              2
                                            )}
                                          </pre>
                                        </div>
                                      )}

                                    {/* Result */}
                                    {toolCall.result && (
                                      <div>
                                        <div className="text-xs text-slate-400 mb-1">
                                          Result:
                                        </div>
                                        <pre className="text-xs bg-slate-900/50 rounded p-2 text-slate-300 overflow-x-auto max-h-32">
                                          {typeof toolCall.result === "string"
                                            ? toolCall.result
                                            : JSON.stringify(
                                                toolCall.result,
                                                null,
                                                2
                                              )}
                                        </pre>
                                      </div>
                                    )}

                                    {/* Error */}
                                    {toolCall.status === "error" &&
                                      toolCall.error && (
                                        <div>
                                          <div className="text-xs text-red-400 mb-1">
                                            Error:
                                          </div>
                                          <pre className="text-xs bg-red-900/20 rounded p-2 text-red-300 overflow-x-auto">
                                            {toolCall.error}
                                          </pre>
                                        </div>
                                      )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Legacy output display */}
                  {message.data?.output && (
                    <details className="mt-3 pt-3 border-t border-slate-600/50">
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300 flex items-center space-x-1">
                        <CommandLineIcon className="w-3 h-3" />
                        <span>View Output</span>
                      </summary>
                      <pre className="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs text-slate-300 overflow-x-auto border border-slate-700/50">
                        {JSON.stringify(message.data.output, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div
                className={`mt-2 text-xs text-slate-500 ${
                  message.type === "user" ? "text-right" : "text-left"
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Typing Indicator */}
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-3"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
              <span className="text-sm text-purple-200">AI is thinking...</span>
            </div>
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
