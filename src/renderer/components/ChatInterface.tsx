import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PaperAirplaneIcon,
  UserIcon,
  CpuChipIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  PlayIcon,
  StopIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  PlusIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import {
  CpuChipIcon as CpuChipIconSolid,
  SparklesIcon as SparklesIconSolid,
} from "@heroicons/react/24/solid";
import { ModelConfig } from "../../shared/types";
import { ModelConfigModal } from "./ModelConfigModal";

interface BaseChatMessage {
  id: string;
  timestamp: Date;
}

interface UserMessage extends BaseChatMessage {
  role: "user";
  content: string;
}

interface AssistantMessage extends BaseChatMessage {
  role: "assistant";
  content: string;
  toolCalls?: Array<{
    name: string;
    args: any;
    result?: any;
    status?: "executing" | "completed" | "failed";
    duration?: number;
  }>;
  error?: string;
  isExecutingTools?: boolean;
}

interface ToolExecutionMessage extends BaseChatMessage {
  role: "tool-execution";
  content?: string;
  tools: Array<{
    name: string;
    args: any;
    status: "queued" | "executing" | "completed" | "failed";
    result?: any;
    duration?: number;
    startTime?: Date;
    modelId?: string; // ID of the model used for this tool
  }>;
}

type ChatMessage = UserMessage | AssistantMessage | ToolExecutionMessage;

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, model?: string) => void;
  onClearChat?: () => void;
  isLoading?: boolean;
  connectedServers: number;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isLoading = false,
  connectedServers,
}) => {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [configuredModels, setConfiguredModels] = useState<ModelConfig[]>([]);
  const [showModelConfigModal, setShowModelConfigModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedToolExecution, setExpandedToolExecution] = useState<
    Record<string, boolean>
  >({});

  // Load configured models on component mount
  useEffect(() => {
    loadConfiguredModels();
  }, []);

  // Load configured models from electronAPI
  const loadConfiguredModels = async () => {
    try {
      const models: ModelConfig[] = await window.electronAPI.getModelConfigs();
      setConfiguredModels(models);
      
      // Set the first enabled model as default, or the default model if found
      const defaultModel = models.find((m: ModelConfig) => m.isDefault && m.enabled);
      const firstEnabledModel = models.find((m: ModelConfig) => m.enabled);
      
      if (defaultModel) {
        setSelectedModel(defaultModel.id);
      } else if (firstEnabledModel) {
        setSelectedModel(firstEnabledModel.id);
      }
    } catch (error) {
      console.error("Failed to load configured models:", error);
    }
  };

  // Handle saving a new model configuration
  const handleSaveModel = async (config: ModelConfig) => {
    try {
      await window.electronAPI.saveModelConfig(config);
      await loadConfiguredModels(); // Reload models
      setShowModelConfigModal(false);
    } catch (error) {
      console.error("Failed to save model config:", error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // Check if a model is selected
    if (!selectedModel || configuredModels.length === 0) {
      // If no model is configured, still send the message but let the backend handle it
      onSendMessage(input.trim());
    } else {
      onSendMessage(input.trim(), selectedModel);
    }
    
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 2000) {
      setInput(value);
    }

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const renderToolExecutionMessage = (
    message: ToolExecutionMessage,
    index: number
  ) => {
    const isExpanded = expandedToolExecution[message.id] ?? false; // Default to collapsed
    const toggleExpanded = () => {
      setExpandedToolExecution((prev) => ({
        ...prev,
        [message.id]: !prev[message.id],
      }));
    };

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="flex gap-4"
      >
        {/* Tool Execution Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white border border-amber-400 shadow-lg shadow-amber-500/25">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <WrenchScrewdriverIcon className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Tool Execution Content */}
        <div className="flex-1 max-w-3xl">
          <motion.div
            className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl shadow-lg overflow-hidden"
            whileHover={{ borderColor: "rgb(251 191 36 / 0.5)" }}
          >
            {/* Collapsible Header */}
            <button
              onClick={toggleExpanded}
              className="w-full p-4 flex items-center justify-between hover:bg-amber-500/10 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <WrenchScrewdriverIcon className="w-4 h-4 text-amber-400" />
                  </motion.div>
                  <span className="text-sm font-semibold text-amber-300">
                    {message.tools.length === 1
                      ? `AI is executing ${message.tools[0].name}`
                      : `AI is executing tools (${message.tools.length})`}
                  </span>
                  {/* Show model information if available */}
                  {message.tools.length > 0 && message.tools[0].modelId && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30">
                      via {message.tools[0].modelId}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {message.tools.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-md border border-amber-500/30"
                    >
                      {tool.name}
                    </span>
                  ))}
                </div>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-amber-400"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.div>
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="border-t border-amber-500/30"
                >
                  <div className="p-4 space-y-3">
                    {message.tools.map((tool, toolIndex) => (
                      <motion.div
                        key={toolIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: toolIndex * 0.1 }}
                        className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                tool.status === "queued"
                                  ? "bg-slate-400"
                                  : tool.status === "executing"
                                  ? "bg-yellow-400 animate-pulse"
                                  : tool.status === "failed"
                                  ? "bg-red-400"
                                  : "bg-emerald-400"
                              }`}
                            ></div>
                            <span className="font-medium text-white text-sm">
                              {tool.name}
                            </span>
                            {tool.modelId && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30">
                                {tool.modelId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {tool.status === "queued" && (
                              <span className="text-slate-400 flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                Queued
                              </span>
                            )}
                            {tool.status === "executing" && (
                              <motion.span
                                className="text-yellow-400 flex items-center gap-1"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              >
                                <PlayIcon className="w-3 h-3" />
                                Executing...
                              </motion.span>
                            )}
                            {tool.status === "completed" && (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircleIcon className="w-3 h-3" />
                                Completed{" "}
                                {tool.duration && `(${tool.duration}ms)`}
                              </span>
                            )}
                            {tool.status === "failed" && (
                              <span className="text-red-400 flex items-center gap-1">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                Failed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tool Arguments */}
                        {Object.keys(tool.args || {}).length > 0 && (
                          <div className="mb-2 p-2 bg-slate-900/50 rounded text-xs">
                            <div className="text-slate-400 mb-1 font-medium">
                              Arguments:
                            </div>
                            <div className="text-slate-300 font-mono text-xs max-h-20 overflow-y-auto">
                              {JSON.stringify(tool.args, null, 2)}
                            </div>
                          </div>
                        )}

                        {/* Tool Result (only if completed) */}
                        {tool.result && tool.status === "completed" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="p-2 bg-emerald-900/20 border border-emerald-700/30 rounded text-xs"
                          >
                            <div className="text-emerald-400 mb-1 font-medium">
                              Result:
                            </div>
                            <div className="text-slate-300 font-mono text-xs max-h-32 overflow-y-auto">
                              {typeof tool.result === "string"
                                ? tool.result
                                : JSON.stringify(tool.result, null, 2)}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}

                    {/* Timestamp */}
                    <div className="mt-3 text-xs text-amber-400/60">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    // Handle tool execution messages
    if (message.role === "tool-execution") {
      return renderToolExecutionMessage(message, index);
    }

    const isUser = message.role === "user";

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            isUser
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg"
              : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border border-emerald-400 shadow-lg shadow-emerald-500/25"
          }`}
        >
          {isUser ? (
            <UserIcon className="w-5 h-5" />
          ) : (
            <CpuChipIconSolid className="w-5 h-5" />
          )}
        </div>

        {/* Message Content */}
        <div className={`flex-1 max-w-3xl ${isUser ? "text-right" : ""}`}>
          <div
            className={`inline-block max-w-full p-4 rounded-2xl ${
              isUser
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg"
                : "bg-slate-800/80 backdrop-blur-sm text-white border border-slate-700/50 shadow-lg"
            }`}
          >
            {/* Message Text */}
            <div className="prose prose-sm max-w-none">
              <p
                className={`whitespace-pre-wrap break-words leading-relaxed m-0 ${
                  isUser ? "text-white" : "text-zinc-100"
                }`}
              >
                {message.content}
              </p>
            </div>

            {/* Tool Execution Indicator */}
            {message.role === "assistant" && message.isExecutingTools && (
              <div className="mt-3 pt-3 border-t border-slate-600/50">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-2 text-emerald-400"
                >
                  <WrenchScrewdriverIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Executing tools...
                  </span>
                </motion.div>
              </div>
            )}

            {/* Error */}
            {message.role === "assistant" && message.error && (
              <div className="mt-3 pt-3 border-t border-red-500/30">
                <div className="flex items-center gap-2 text-red-300">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="text-xs">{message.error}</span>
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div
              className={`mt-2 text-xs opacity-60 ${
                isUser ? "text-white" : "text-slate-400"
              }`}
            >
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderToolsUsedSection = (
    message: AssistantMessage,
    messageIndex: number
  ) => {
    if (!message.toolCalls || message.toolCalls.length === 0) {
      return null;
    }

    const isExpanded = expandedTools[message.id] || false;
    const toggleExpanded = () => {
      setExpandedTools((prev) => ({
        ...prev,
        [message.id]: !prev[message.id],
      }));
    };

    return (
      <motion.div
        key={`tools-${message.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: messageIndex * 0.1 + 0.2 }}
        className="flex gap-4 mt-3"
      >
        {/* Tool Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white border border-blue-400 shadow-lg shadow-blue-500/25">
          <WrenchScrewdriverIcon className="w-5 h-5" />
        </div>

        {/* Tools Used Section */}
        <div className="flex-1 max-w-3xl">
          <motion.div
            className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-lg overflow-hidden"
            whileHover={{ borderColor: "rgb(59 130 246 / 0.5)" }}
          >
            {/* Collapsible Header */}
            <button
              onClick={toggleExpanded}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-200">
                    Tools Used ({message.toolCalls.length})
                  </span>
                </div>
                <div className="flex gap-1">
                  {message.toolCalls.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-md border border-blue-500/30"
                    >
                      {tool.name}
                    </span>
                  ))}
                </div>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.div>
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="border-t border-slate-700/50"
                >
                  <div className="p-4 space-y-3">
                    {message.toolCalls.map((tool: any, toolIndex: number) => (
                      <motion.div
                        key={toolIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: toolIndex * 0.1 }}
                        className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                tool.status === "executing"
                                  ? "bg-yellow-400 animate-pulse"
                                  : tool.status === "failed"
                                  ? "bg-red-400"
                                  : "bg-emerald-400"
                              }`}
                            ></div>
                            <span className="font-medium text-white text-sm">
                              {tool.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            {tool.status === "executing" && (
                              <PlayIcon className="w-3 h-3" />
                            )}
                            {tool.status === "completed" && (
                              <CheckCircleIcon className="w-3 h-3 text-emerald-400" />
                            )}
                            {tool.status === "failed" && (
                              <ExclamationTriangleIcon className="w-3 h-3 text-red-400" />
                            )}
                            <span className="capitalize">
                              {tool.status || "completed"}
                            </span>
                          </div>
                        </div>

                        {Object.keys(tool.args).length > 0 && (
                          <div className="mb-2 p-2 bg-slate-800/50 rounded text-xs">
                            <div className="text-slate-400 mb-1 font-medium">
                              Arguments:
                            </div>
                            <div className="text-slate-300 font-mono">
                              {JSON.stringify(tool.args, null, 2)}
                            </div>
                          </div>
                        )}

                        {tool.result && (
                          <div className="p-2 bg-emerald-900/20 border border-emerald-700/30 rounded text-xs">
                            <div className="text-emerald-400 mb-1 font-medium">
                              Result:
                            </div>
                            <div className="text-slate-300 font-mono">
                              {typeof tool.result === "string"
                                ? tool.result
                                : JSON.stringify(tool.result, null, 2)}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Assistant</h2>
              <p className="text-sm text-slate-400">
                {connectedServers > 0
                  ? `Connected to ${connectedServers} server${
                      connectedServers !== 1 ? "s" : ""
                    }`
                  : "No servers connected"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Start New Chat Button */}
            {messages.length > 0 && onClearChat && (
              <motion.button
                onClick={onClearChat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all duration-200 text-sm font-medium"
                title="Start a new chat session"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span>New Chat</span>
              </motion.button>
            )}

            {/* Status Indicator */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isLoading
                    ? "bg-yellow-400"
                    : connectedServers > 0
                    ? "bg-emerald-400"
                    : "bg-slate-500"
                }`}
              ></div>
              <span className="text-sm text-slate-300">
                {isLoading
                  ? "Processing..."
                  : connectedServers > 0
                  ? "Ready with MCP tools"
                  : "Ready (no MCP tools)"}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-950/50 to-slate-900/30">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-3xl blur-2xl"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                  <SparklesIcon className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-200 mb-3">
                Welcome to MCP Studio
              </h3>
              <p className="text-slate-400 max-w-md mb-6 text-lg">
                Ask me anything! I can respond with my knowledge or use MCP
                tools if servers are connected.
              </p>
              {connectedServers === 0 && (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4"
                >
                  <p className="text-amber-400 text-sm">
                    💡 Connect some MCP servers first to unlock more
                    capabilities!
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => {
                if (message.role === "tool-execution") {
                  return renderToolExecutionMessage(
                    message as ToolExecutionMessage,
                    index
                  );
                }

                // Render the main message
                const mainMessage = renderMessage(message, index);

                // If it's an assistant message with tool calls, render the tools section separately
                if (
                  message.role === "assistant" &&
                  message.toolCalls &&
                  message.toolCalls.length > 0
                ) {
                  return (
                    <div key={message.id} className="space-y-3">
                      {mainMessage}
                      {renderToolsUsedSection(
                        message as AssistantMessage,
                        index
                      )}
                    </div>
                  );
                }

                return mainMessage;
              })}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white border border-emerald-400 shadow-lg shadow-emerald-500/25">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <CpuChipIconSolid className="w-5 h-5" />
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <motion.div
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: 0,
                            }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: 0.2,
                            }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: 0.4,
                            }}
                          />
                        </div>
                        <span className="text-white">
                          Assistant is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-3 border-t border-slate-800/50 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl"
      >
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex-1 relative group">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                configuredModels.length === 0
                  ? "Configure an AI model to start chatting..."
                  : connectedServers > 0
                  ? "Ask me anything about your MCP servers..."
                  : "Ask me anything... (no MCP tools available)"
              }
              disabled={isLoading || configuredModels.length === 0}
              className="w-full bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl px-5 py-4 pr-32 pb-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 resize-none min-h-[60px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg group-hover:shadow-emerald-500/10 focus:shadow-emerald-500/20"
              rows={1}
            />

            {/* Model Selector - Positioned inside textarea */}
            <div className="absolute left-5 bottom-3 flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/50 rounded-md text-slate-300 hover:text-white transition-all duration-200 text-xs font-medium"
                >
                  <CpuChipIcon className="w-3.5 h-3.5" />
                  <span>
                    {configuredModels.find((m) => m.id === selectedModel)
                      ?.modelId || "No Model"}
                  </span>
                  <ChevronDownIcon
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isModelDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isModelDropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsModelDropdownOpen(false)}
                      />

                      {/* Dropdown */}
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full mb-2 left-0 w-80 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-20 overflow-hidden"
                      >
                        <div className="p-2">
                          <div className="text-xs font-medium text-slate-400 px-3 py-2">
                            Choose AI Model
                          </div>
                          
                          {/* Add Model Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowModelConfigModal(true);
                              setIsModelDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200 border-b border-slate-700/50 mb-2"
                          >
                            <div className="flex items-center gap-3">
                              <PlusIcon className="w-4 h-4 text-blue-400" />
                              <div>
                                <div className="font-medium text-sm text-blue-400">
                                  Add New Model
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  Configure a new AI model
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Configured Models */}
                          {configuredModels.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                              <CogIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                              <div className="text-sm text-slate-400 mb-1">No models configured</div>
                              <div className="text-xs text-slate-500">Add your first model to get started</div>
                            </div>
                          ) : (
                            configuredModels
                              .filter(model => model.enabled)
                              .map((model) => (
                                <button
                                  key={model.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedModel(model.id);
                                    setIsModelDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 ${
                                    selectedModel === model.id
                                      ? "bg-indigo-500/20 border border-indigo-500/30 text-white"
                                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-sm">
                                        {model.modelId}
                                        {model.isDefault && (
                                          <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                            Default
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 mt-1">
                                        {model.name} • {model.provider}
                                      </div>
                                    </div>
                                    {selectedModel === model.id && (
                                      <CheckCircleIcon className="w-4 h-4 text-indigo-400" />
                                    )}
                                  </div>
                                </button>
                              ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Character Count - Positioned inside textarea */}
            <div className="absolute right-5 bottom-3 flex items-center gap-2">
              <span
                className={`text-xs transition-colors duration-200 ${
                  input.length > 1800
                    ? "text-amber-400"
                    : input.length > 2000
                    ? "text-red-400"
                    : "text-slate-500"
                }`}
              >
                {input.length}/2000
              </span>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={
              !input.trim() ||
              isLoading ||
              input.length > 2000 ||
              connectedServers === 0
            }
            className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-emerald-500/30 disabled:shadow-none disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <SparklesIconSolid className="w-6 h-6" />
              </motion.div>
            ) : (
              <PaperAirplaneIcon className="w-6 h-6" />
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* Model Configuration Modal */}
      <ModelConfigModal
        isOpen={showModelConfigModal}
        onClose={() => setShowModelConfigModal(false)}
        onSave={handleSaveModel}
      />
    </div>
  );
};

export default ChatInterface;
