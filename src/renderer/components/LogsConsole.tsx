import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  CommandLineIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success' | 'debug';
  source: string;
  message: string;
  details?: any;
}

interface LogsConsoleProps {
  logs?: LogEntry[];
  onClear?: () => void;
}

const levelIcons = {
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  error: ExclamationTriangleIcon,
  success: CheckCircleIcon,
  debug: CommandLineIcon,
};

const levelColors = {
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  debug: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

export const LogsConsole: React.FC<LogsConsoleProps> = ({ 
  logs = [], 
  onClear 
}) => {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mock logs for demonstration
  const mockLogs: LogEntry[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 60000),
      level: 'info',
      source: 'MCP Server',
      message: 'Server connection established',
      details: { serverId: 'server-1', protocol: 'websocket' }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 45000),
      level: 'success',
      source: 'Tool Manager',
      message: 'Loaded 5 tools from filesystem server',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 30000),
      level: 'warning',
      source: 'Auth Service',
      message: 'Rate limit approaching for API calls',
      details: { remaining: 95, limit: 1000 }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 15000),
      level: 'debug',
      source: 'WebSocket',
      message: 'Heartbeat received from server',
    },
    {
      id: '5',
      timestamp: new Date(),
      level: 'error',
      source: 'Connection Manager',
      message: 'Failed to connect to server "example-server"',
      details: { error: 'ECONNREFUSED', port: 3000 }
    },
  ];

  const displayLogs = logs.length > 0 ? logs : mockLogs;
  const filteredLogs = filter === 'all' 
    ? displayLogs 
    : displayLogs.filter(log => log.level === filter);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950/50">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/50">
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
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              Auto Scroll
            </button>

            {/* Clear Logs */}
            <button
              onClick={onClear}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-all duration-200"
            >
              Clear Logs
            </button>
          </div>
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 flex">
        {/* Log List */}
        <div className="flex-1 flex flex-col">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm"
          >
            <AnimatePresence>
              {filteredLogs.map((log) => {
                const IconComponent = levelIcons[log.level];
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-slate-800/50 ${
                      selectedLog?.id === log.id 
                        ? 'bg-slate-800/80 border-slate-600' 
                        : `${levelColors[log.level]} hover:border-slate-600`
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-500 text-xs">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <span className="text-slate-400 text-xs px-2 py-0.5 bg-slate-800/50 rounded">
                          {log.source}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded uppercase font-medium ${levelColors[log.level]}`}>
                          {log.level}
                        </span>
                      </div>
                      <p className="text-slate-200 mt-1 break-words">
                        {log.message}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <CommandLineIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  No logs found
                </h3>
                <p className="text-slate-500">
                  {filter === 'all' ? 'No system logs available' : `No ${filter} logs found`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Log Details Panel */}
        <AnimatePresence>
          {selectedLog && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="w-96 border-l border-slate-800/50 bg-slate-900/50 backdrop-blur-xl"
            >
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
                    <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${levelColors[selectedLog.level]}`}>
                      {React.createElement(levelIcons[selectedLog.level], { className: 'w-4 h-4' })}
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
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.details, null, 2))}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LogsConsole;
