import React, { useState, useRef, useEffect } from "react";
import {
  XMarkIcon,
  CommandLineIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  CpuChipIcon,
  GlobeAltIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { LogEntry } from "../../shared/types";
import { useLogsStore } from "../stores/logsStore";

interface LogsConsoleProps {
  // No props needed - we'll get logs from the store
}

const levelIcons = {
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  error: ExclamationTriangleIcon,
  success: CheckCircleIcon,
  debug: CommandLineIcon,
};

const levelColors = {
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  error: "text-red-400 bg-red-500/10 border-red-500/20",
  success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  debug: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

const categoryIcons = {
  system: CpuChipIcon,
  server: ServerIcon,
  tool: WrenchScrewdriverIcon,
  api: GlobeAltIcon,
  ui: EyeIcon,
};

export const LogsConsole: React.FC<LogsConsoleProps> = () => {
  const { logs, clearAllLogs } = useLogsStore();
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [collapsedLogs, setCollapsedLogs] = useState<Set<string>>(new Set());
  const [compactView, setCompactView] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.level === filter);

  const toggleLogCollapse = (logId: string) => {
    const newCollapsed = new Set(collapsedLogs);
    if (newCollapsed.has(logId)) {
      newCollapsed.delete(logId);
    } else {
      newCollapsed.add(logId);
    }
    setCollapsedLogs(newCollapsed);
  };

  const toggleAllLogs = () => {
    if (collapsedLogs.size === filteredLogs.length) {
      // All are collapsed, expand all
      setCollapsedLogs(new Set());
    } else {
      // Some or none are collapsed, collapse all
      setCollapsedLogs(new Set(filteredLogs.map((log) => log.id)));
    }
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      // Add a small delay to account for animations
      const scrollToBottom = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      };

      // Scroll immediately
      scrollToBottom();

      // Also scroll after a short delay to account for animations
      const timeoutId = setTimeout(scrollToBottom, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [filteredLogs, autoScroll]);

  // Manual scroll to bottom function
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Handle manual scroll to disable auto-scroll if user scrolls up
  const handleScroll = () => {
    if (scrollRef.current && autoScroll) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold

      if (!isNearBottom) {
        setAutoScroll(false);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950/50 h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
              System Logs
            </h2>
            <p className="text-slate-400">
              Monitor system events, errors, and debug information
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Compact View Toggle */}
            <button
              onClick={() => setCompactView(!compactView)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                compactView
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
              }`}
              title="Toggle compact view"
            >
              Compact {compactView ? "ON" : "OFF"}
            </button>

            {/* Collapse All Toggle */}
            <button
              onClick={toggleAllLogs}
              className="px-3 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-all duration-200"
              title={
                collapsedLogs.size === filteredLogs.length
                  ? "Expand all logs"
                  : "Collapse all logs"
              }
            >
              {collapsedLogs.size === filteredLogs.length
                ? "Expand All"
                : "Collapse All"}
            </button>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Levels</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="debug">Debug</option>
            </select>

            {/* Auto Scroll Toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                autoScroll
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              Auto Scroll {autoScroll ? "ON" : "OFF"}
            </button>

            {/* Manual Scroll to Bottom */}
            <button
              onClick={scrollToBottom}
              className="px-3 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-all duration-200"
              title="Scroll to bottom"
            >
              ↓ Bottom
            </button>

            {/* Clear Logs */}
            <button
              onClick={clearAllLogs}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-all duration-200"
            >
              Clear Logs
            </button>
          </div>
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Log List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm"
          >
            {filteredLogs.map((log) => {
              const IconComponent = levelIcons[log.level];
              const CategoryIcon = categoryIcons[log.category || "system"];
              const isCollapsed = collapsedLogs.has(log.id);

              return (
                <div
                  key={log.id}
                  className={`border rounded-lg transition-all duration-200 ${
                    selectedLog?.id === log.id
                      ? "bg-slate-800/80 border-slate-600"
                      : `${levelColors[log.level]} hover:border-slate-600`
                  }`}
                >
                  {/* Log Header */}
                  <div
                    className={`flex items-start space-x-3 p-3 cursor-pointer transition-all duration-200 hover:bg-slate-800/50 ${
                      compactView ? "py-2" : "py-3"
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Collapse Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLogCollapse(log.id);
                      }}
                      className="flex-shrink-0 p-0.5 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                    >
                      {isCollapsed ? (
                        <ChevronRightIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </button>

                    {/* Level Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        {/* Timestamp */}
                        <span className="text-slate-500 text-xs font-mono">
                          {formatTimestamp(log.timestamp)}
                        </span>

                        {/* Level Badge */}
                        <span
                          className={`text-xs px-2 py-0.5 rounded uppercase font-medium ${
                            levelColors[log.level]
                          }`}
                        >
                          {log.level}
                        </span>

                        {/* Category Badge */}
                        {log.category && (
                          <span className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded">
                            <CategoryIcon className="w-3 h-3" />
                            <span>{log.category}</span>
                          </span>
                        )}

                        {/* Server Info */}
                        {log.serverName && (
                          <span className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                            <ServerIcon className="w-3 h-3" />
                            <span>{log.serverName}</span>
                          </span>
                        )}

                        {/* Tool Info */}
                        {log.toolName && (
                          <span className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">
                            <WrenchScrewdriverIcon className="w-3 h-3" />
                            <span>{log.toolName}</span>
                          </span>
                        )}

                        {/* Source */}
                        <span className="text-slate-400 text-xs px-2 py-0.5 bg-slate-800/50 rounded">
                          {log.source}
                        </span>
                      </div>

                      {/* Message - Always show first line, full message when expanded */}
                      <div className="mt-1">
                        {isCollapsed ? (
                          <p className="text-slate-200 text-sm break-words line-clamp-1">
                            {log.message.split("\n")[0]}
                            {log.message.includes("\n") && (
                              <span className="text-slate-500 ml-2">...</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-slate-200 text-sm break-words whitespace-pre-wrap">
                            {log.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {!isCollapsed && log.details && (
                    <div className="border-t border-slate-700/50 p-3 bg-slate-800/30">
                      <div className="text-xs text-slate-400 mb-2">
                        Details:
                      </div>
                      <pre className="text-slate-300 text-xs bg-slate-900/50 p-2 rounded font-mono overflow-x-auto max-h-32">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <CommandLineIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  No logs found
                </h3>
                <p className="text-slate-500">
                  {filter === "all"
                    ? "No system logs available"
                    : `No ${filter} logs found`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Log Details Panel */}
        {selectedLog && (
          <div className="w-96 border-l border-slate-800/50 bg-slate-900/50 backdrop-blur-xl">
            <div className="p-4 border-b border-slate-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-200">
                  Log Details
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">
                  Timestamp
                </label>
                <p className="text-slate-200 font-mono text-sm mt-1">
                  {selectedLog.timestamp.toISOString()}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">
                  Level
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                      levelColors[selectedLog.level]
                    }`}
                  >
                    {React.createElement(levelIcons[selectedLog.level], {
                      className: "w-4 h-4",
                    })}
                    <span className="uppercase">{selectedLog.level}</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">
                  Source
                </label>
                <p className="text-slate-200 text-sm mt-1">
                  {selectedLog.source}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">
                  Message
                </label>
                <div className="relative mt-1">
                  <p className="text-slate-200 text-sm bg-slate-800/50 p-3 rounded-lg font-mono break-words">
                    {selectedLog.message}
                  </p>
                  <button
                    onClick={() => copyToClipboard(selectedLog.message)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">
                    Details
                  </label>
                  <div className="relative mt-1">
                    <pre className="text-slate-200 text-xs bg-slate-800/50 p-3 rounded-lg font-mono overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(selectedLog.details, null, 2)
                        )
                      }
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsConsole;
