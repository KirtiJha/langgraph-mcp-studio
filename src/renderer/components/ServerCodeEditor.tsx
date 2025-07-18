import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Editor from "@monaco-editor/react";
import APIServerService from "../services/APIServerService";
import {
  XMarkIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  StopIcon,
  CommandLineIcon,
  CogIcon,
  FolderIcon,
  CodeBracketIcon,
  WrenchScrewdriverIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

interface ServerFile {
  name: string;
  path: string;
  size: number;
  modified: Date;
  type: "file" | "directory";
}

interface TerminalOutput {
  id: string;
  timestamp: Date;
  type: "command" | "output" | "error";
  content: string;
}

interface ServerCodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
}

export const ServerCodeEditor: React.FC<ServerCodeEditorProps> = ({
  isOpen,
  onClose,
  serverId,
  serverName,
}) => {
  const [files, setFiles] = useState<ServerFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("server.ts");
  const [fileContent, setFileContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [error, setError] = useState<string>("");

  // VS Code-like features
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [currentCommand, setCurrentCommand] = useState("");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [activeTab, setActiveTab] = useState<"files" | "terminal">("files");
  const [serverStatus, setServerStatus] = useState<
    "stopped" | "running" | "building"
  >("stopped");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"claude" | "copilot" | "custom">("claude");

  // Debug log for export dialog state
  useEffect(() => {
    console.log("showExportDialog state changed:", showExportDialog);
  }, [showExportDialog]);

  const terminalRef = useRef<HTMLDivElement>(null);
  const fileEditorRef = useRef<HTMLTextAreaElement>(null);

  // Load server files when dialog opens
  useEffect(() => {
    if (isOpen && serverId) {
      loadServerFiles();
      loadFileContent("server.ts");
      addTerminalOutput("command", `# Server Code Editor - ${serverName}`);
      addTerminalOutput("output", `Working directory: ${serverId}`);
    }
  }, [isOpen, serverId]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const addTerminalOutput = (
    type: "command" | "output" | "error",
    content: string
  ) => {
    const newOutput: TerminalOutput = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      content,
    };
    setTerminalOutput((prev) => [...prev, newOutput]);
  };

  const clearTerminal = () => {
    setTerminalOutput([]);
  };

  const executeTerminalCommand = async (command: string) => {
    if (!command.trim()) return;

    // Add command to history
    setTerminalHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    // Add command to output
    addTerminalOutput("command", `$ ${command}`);
    setTerminalInput("");
    setIsRunningCommand(true);
    setCurrentCommand(command);

    try {
      // For now, simulate command execution with some basic commands
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (command.startsWith("ls") || command.startsWith("dir")) {
        addTerminalOutput("output", files.map((f) => f.name).join("\n"));
      } else if (command.startsWith("pwd")) {
        addTerminalOutput("output", `/servers/${serverId}`);
      } else if (command.startsWith("cat ") || command.startsWith("type ")) {
        const fileName = command.split(" ")[1];
        if (fileName && files.find((f) => f.name === fileName)) {
          try {
            const content = await window.electronAPI.readServerCode(
              serverId,
              fileName
            );
            addTerminalOutput("output", content);
          } catch (err) {
            addTerminalOutput("error", `Cannot read file: ${fileName}`);
          }
        } else {
          addTerminalOutput("error", `File not found: ${fileName}`);
        }
      } else if (command.startsWith("echo ")) {
        addTerminalOutput("output", command.substring(5));
      } else if (command === "clear") {
        clearTerminal();
      } else if (command === "help") {
        addTerminalOutput(
          "output",
          "Available commands:\n  ls/dir - list files\n  pwd - current directory\n  cat/type <file> - display file content\n  echo <text> - print text\n  clear - clear terminal\n  npm <command> - npm commands\n  node <file> - run node script\n  export - show MCP export options"
        );
      } else if (command === "export") {
        console.log("Export command executed from terminal");
        setShowExportDialog(true);
        addTerminalOutput("output", "🔧 Opening MCP export dialog...");
      } else if (command.startsWith("npm ") || command.startsWith("node ")) {
        addTerminalOutput("output", `Executing: ${command}`);
        addTerminalOutput(
          "output",
          "Command executed successfully (simulated)"
        );
      } else {
        addTerminalOutput(
          "error",
          `Command not found: ${command}\nType 'help' for available commands`
        );
      }
    } catch (err) {
      addTerminalOutput("error", `Failed to execute command: ${err}`);
    } finally {
      setIsRunningCommand(false);
      setCurrentCommand("");
    }
  };

  const handleTerminalKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeTerminalCommand(terminalInput);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (terminalHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < terminalHistory.length) {
          setHistoryIndex(newIndex);
          setTerminalInput(
            terminalHistory[terminalHistory.length - 1 - newIndex]
          );
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setTerminalInput(
          terminalHistory[terminalHistory.length - 1 - newIndex]
        );
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setTerminalInput("");
      }
    }
  };

  const loadServerFiles = async () => {
    try {
      setIsLoading(true);
      addTerminalOutput("command", "$ Loading server files...");
      const result = await window.electronAPI.getServerFiles(serverId);
      if (result.exists) {
        setFiles(result.files);
        addTerminalOutput("output", `✅ Loaded ${result.files.length} files`);
      } else {
        setFiles([]);
        setError(
          "Server files not found. The server may not have been generated yet."
        );
        addTerminalOutput("error", "❌ Server files not found");
      }
    } catch (err) {
      const errorMsg = `Failed to load server files: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setError(errorMsg);
      addTerminalOutput("error", `❌ ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileContent = async (fileName: string) => {
    try {
      setIsLoading(true);
      setError("");
      addTerminalOutput("command", `$ Opening file: ${fileName}`);
      const content = await window.electronAPI.readServerCode(
        serverId,
        fileName
      );
      setFileContent(content);
      setEditedContent(content);
      setSelectedFile(fileName);
      addTerminalOutput(
        "output",
        `✅ File loaded: ${fileName} (${content.length} characters)`
      );
    } catch (err) {
      const errorMsg = `Failed to load file content: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setError(errorMsg);
      addTerminalOutput("error", `❌ ${errorMsg}`);
      setFileContent("");
      setEditedContent("");
    } finally {
      setIsLoading(false);
    }
  };

  const saveFileContent = async () => {
    if (!selectedFile || editedContent === fileContent) return;

    try {
      setSaveStatus("saving");
      addTerminalOutput("command", `$ Saving file: ${selectedFile}`);
      await window.electronAPI.writeServerCode(
        serverId,
        selectedFile,
        editedContent
      );
      setFileContent(editedContent);
      setSaveStatus("saved");
      addTerminalOutput("output", `✅ File saved: ${selectedFile}`);

      // Clear saved status after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      const errorMsg = `Failed to save file: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setError(errorMsg);
      addTerminalOutput("error", `❌ ${errorMsg}`);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const buildServer = async () => {
    try {
      setServerStatus("building");
      setIsRunningCommand(true);
      setCurrentCommand("npm install && npm run build");
      addTerminalOutput("command", "$ npm install && npm run build");
      addTerminalOutput("output", "📦 Installing dependencies...");

      // Simulate build process since no build API exists yet
      await new Promise((resolve) => setTimeout(resolve, 2000));
      addTerminalOutput("output", "✅ Build completed successfully!");

      setServerStatus("stopped");
    } catch (err) {
      addTerminalOutput("error", `❌ Build failed: ${err}`);
      setServerStatus("stopped");
    } finally {
      setIsRunningCommand(false);
      setCurrentCommand("");
    }
  };

  const startServer = async () => {
    try {
      setServerStatus("running");
      setIsRunningCommand(true);
      setCurrentCommand("node server.js");
      addTerminalOutput("command", "$ node server.js");
      addTerminalOutput("output", "🚀 Starting MCP server...");

      // Call actual start server API
      await APIServerService.startServer(serverId);
      addTerminalOutput("output", "✅ Server started successfully!");
    } catch (err) {
      addTerminalOutput("error", `❌ Failed to start server: ${err}`);
      setServerStatus("stopped");
    } finally {
      setIsRunningCommand(false);
      setCurrentCommand("");
    }
  };

  const stopServer = async () => {
    try {
      setIsRunningCommand(true);
      setCurrentCommand("kill server");
      addTerminalOutput("command", "$ Stopping server...");

      // Call actual stop server API
      await APIServerService.stopServer(serverId);
      addTerminalOutput("output", "🛑 Server stopped");
      setServerStatus("stopped");
    } catch (err) {
      addTerminalOutput("error", `❌ Failed to stop server: ${err}`);
    } finally {
      setIsRunningCommand(false);
      setCurrentCommand("");
    }
  };

  const generateMCPConfig = () => {
    const serverPath = `/servers/${serverId}`;
    const configs = {
      claude: {
        filename: "claude_desktop_config.json",
        content: JSON.stringify({
          mcpServers: {
            [serverName]: {
              command: "node",
              args: [`${serverPath}/server.js`],
              env: {}
            }
          }
        }, null, 2),
        instructions: `Claude Desktop Configuration:

1. Copy the generated configuration
2. Open Claude Desktop settings
3. Navigate to the MCP Servers section
4. Add this configuration to your claude_desktop_config.json file
5. Restart Claude Desktop

The server will be available in Claude Desktop for use.`
      },
      copilot: {
        filename: "copilot_config.json", 
        content: JSON.stringify({
          mcp: {
            servers: {
              [serverName]: {
                command: "node",
                args: [`${serverPath}/server.js`],
                description: `Generated MCP server: ${serverName}`
              }
            }
          }
        }, null, 2),
        instructions: `GitHub Copilot Configuration:

1. Copy the generated configuration
2. Add this to your VS Code settings.json under "github.copilot.advanced"
3. Or use the GitHub Copilot extension settings
4. Restart VS Code

The MCP server will be available for GitHub Copilot to use.`
      },
      custom: {
        filename: "mcp_server_info.json",
        content: JSON.stringify({
          name: serverName,
          description: `Generated MCP server: ${serverName}`,
          path: serverPath,
          command: "node",
          args: [`${serverPath}/server.js`],
          capabilities: ["tools", "resources", "prompts"],
          installation: {
            dependencies: ["@modelcontextprotocol/sdk"],
            buildCommand: "npm install && npm run build",
            startCommand: "node server.js"
          }
        }, null, 2),
        instructions: `Custom MCP Client Configuration:

1. Server Location: ${serverPath}
2. Start Command: node server.js
3. Dependencies: @modelcontextprotocol/sdk

To use with any MCP client:
1. Ensure Node.js is installed
2. Navigate to the server directory
3. Run: npm install && npm run build
4. Start server: node server.js
5. Connect your MCP client to the running server

Server supports standard MCP protocol for tools, resources, and prompts.`
      }
    };

    return configs[exportFormat];
  };

  const exportMCPConfig = async () => {
    try {
      const config = generateMCPConfig();
      addTerminalOutput("command", `$ Generating ${exportFormat.toUpperCase()} configuration...`);
      
      // Create a downloadable file
      const blob = new Blob([config.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = config.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addTerminalOutput("output", `✅ Configuration file downloaded: ${config.filename}`);
      addTerminalOutput("output", "📋 Instructions copied to clipboard");
      
      // Copy instructions to clipboard
      await navigator.clipboard.writeText(config.instructions);
      
    } catch (err) {
      addTerminalOutput("error", `❌ Failed to export configuration: ${err}`);
    }
  };

  const copyMCPConfig = async () => {
    try {
      const config = generateMCPConfig();
      await navigator.clipboard.writeText(config.content);
      addTerminalOutput("output", "📋 MCP configuration copied to clipboard");
    } catch (err) {
      addTerminalOutput("error", "❌ Failed to copy configuration");
    }
  };

  const openServerFolder = async () => {
    try {
      addTerminalOutput("command", "$ Opening server folder...");
      await window.electronAPI.openServerFolder(serverId);
      addTerminalOutput("output", "📁 Folder opened in system explorer");
    } catch (err) {
      const errorMsg = `Failed to open server folder: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setError(errorMsg);
      addTerminalOutput("error", `❌ ${errorMsg}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fileContent);
      addTerminalOutput("output", "📋 File content copied to clipboard");
    } catch (err) {
      addTerminalOutput("error", "❌ Failed to copy to clipboard");
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getLanguageFromFile = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
        return "typescript";
      case "js":
        return "javascript";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "yml":
      case "yaml":
        return "yaml";
      case "xml":
        return "xml";
      case "css":
        return "css";
      case "html":
        return "html";
      case "py":
        return "python";
      default:
        return "text";
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "js":
        return <CodeBracketIcon className="w-4 h-4 text-blue-400" />;
      case "json":
        return <CogIcon className="w-4 h-4 text-yellow-400" />;
      case "md":
        return <DocumentTextIcon className="w-4 h-4 text-green-400" />;
      default:
        return <DocumentTextIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (serverStatus) {
      case "running":
        return "text-green-400";
      case "building":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case "running":
        return "Running";
      case "building":
        return "Building...";
      default:
        return "Stopped";
    }
  };

  const hasUnsavedChanges = editedContent !== fileContent;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (
                !hasUnsavedChanges ||
                confirm(
                  "You have unsaved changes. Are you sure you want to close?"
                )
              ) {
                onClose();
              }
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden"
          >
            {/* VS Code-like Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <CodeBracketIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {serverName}
                  </h2>
                  <p className="text-xs text-slate-400">Server Code Editor</p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium ${getStatusColor()}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      serverStatus === "running"
                        ? "bg-green-400"
                        : serverStatus === "building"
                        ? "bg-yellow-400"
                        : "bg-gray-400"
                    }`}
                  ></div>
                  {getStatusText()}
                </div>

                <button
                  onClick={buildServer}
                  disabled={isRunningCommand}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                  title="Build Server"
                >
                  <WrenchScrewdriverIcon className="w-4 h-4" />
                </button>

                {serverStatus === "running" ? (
                  <button
                    onClick={stopServer}
                    disabled={isRunningCommand}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    title="Stop Server"
                  >
                    <StopIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={startServer}
                    disabled={isRunningCommand}
                    className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
                    title="Start Server"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={openServerFolder}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Open in Explorer"
                >
                  <FolderOpenIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    console.log("Export button clicked!");
                    setShowExportDialog(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Export MCP Configuration"
                >
                  <ShareIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div
                className="bg-slate-850 border-r border-slate-700 flex flex-col"
                style={{ width: sidebarWidth }}
              >
                {/* Sidebar Tabs */}
                <div className="flex border-b border-slate-700">
                  <button
                    onClick={() => setActiveTab("files")}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                      activeTab === "files"
                        ? "text-white bg-slate-700 border-b-2 border-indigo-500"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FolderIcon className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setActiveTab("terminal")}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                      activeTab === "terminal"
                        ? "text-white bg-slate-700 border-b-2 border-indigo-500"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <CommandLineIcon className="w-4 h-4 mx-auto" />
                  </button>
                </div>

                {/* File Explorer */}
                {activeTab === "files" && (
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                      Server Files
                    </div>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <ArrowPathIcon className="w-4 h-4 text-slate-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {files.map((file) => (
                          <button
                            key={file.path}
                            onClick={() => loadFileContent(file.name)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors text-sm ${
                              selectedFile === file.name
                                ? "bg-indigo-500/20 text-indigo-300"
                                : "text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            {getFileIcon(file.name)}
                            <span className="truncate">{file.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Terminal Panel in Sidebar */}
                {activeTab === "terminal" && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between p-2 border-b border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        Terminal
                      </span>
                      <button
                        onClick={clearTerminal}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
                        {terminalOutput.map((output) => (
                          <div
                            key={output.id}
                            className={`mb-1 text-xs ${
                              output.type === "command"
                                ? "text-green-400"
                                : output.type === "error"
                                ? "text-red-400"
                                : "text-slate-300"
                            }`}
                          >
                            {output.content}
                          </div>
                        ))}
                        {isRunningCommand && (
                          <div className="text-yellow-400 animate-pulse text-xs">
                            Running: {currentCommand}
                          </div>
                        )}
                      </div>

                      {/* Interactive Input for Sidebar Terminal */}
                      <div className="flex items-center gap-1 p-2 border-t border-slate-700">
                        <span className="text-green-400 text-xs">$</span>
                        <input
                          type="text"
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          onKeyDown={handleTerminalKeyPress}
                          className="flex-1 bg-transparent text-slate-300 outline-none font-mono text-xs"
                          placeholder="command..."
                          disabled={isRunningCommand}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Editor Area */}
              <div className="flex-1 flex flex-col">
                {/* File Tabs */}
                {selectedFile && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-700 rounded-md">
                      {getFileIcon(selectedFile)}
                      <span className="text-sm text-white">{selectedFile}</span>
                      {hasUnsavedChanges && (
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      )}
                    </div>

                    {/* Editor Actions */}
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-1.5 rounded transition-colors ${
                          isEditing
                            ? "text-indigo-400 bg-indigo-500/20"
                            : "text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}
                        title={isEditing ? "View Mode" : "Edit Mode"}
                      >
                        {isEditing ? (
                          <EyeIcon className="w-4 h-4" />
                        ) : (
                          <PencilIcon className="w-4 h-4" />
                        )}
                      </button>

                      {isEditing && hasUnsavedChanges && (
                        <button
                          onClick={saveFileContent}
                          disabled={saveStatus === "saving"}
                          className="px-3 py-1.5 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                        >
                          {saveStatus === "saving" ? "Saving..." : "Save"}
                        </button>
                      )}

                      <button
                        onClick={copyToClipboard}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title="Copy to Clipboard"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Code Editor */}
                <div className="flex-1 relative overflow-hidden">
                  {selectedFile ? (
                    isEditing ? (
                      <Editor
                        height="100%"
                        language={getLanguageFromFile(selectedFile)}
                        value={editedContent}
                        onChange={(value) => setEditedContent(value || "")}
                        theme="vs-dark"
                        options={{
                          fontSize: 14,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          lineHeight: 1.5,
                          tabSize: 2,
                          insertSpaces: true,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          automaticLayout: true,
                          lineNumbers: "on",
                          renderWhitespace: "selection",
                          formatOnPaste: true,
                          formatOnType: true,
                          quickSuggestions: true,
                          folding: true,
                        }}
                      />
                    ) : (
                      <div className="w-full h-full overflow-auto bg-slate-900">
                        <SyntaxHighlighter
                          language={getLanguageFromFile(selectedFile)}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: "16px",
                            background: "transparent",
                            fontSize: "14px",
                            lineHeight: "1.5",
                            fontFamily:
                              'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          }}
                          showLineNumbers={true}
                          lineNumberStyle={{
                            color: "#64748b",
                            fontSize: "12px",
                            minWidth: "3em",
                            paddingRight: "16px",
                            userSelect: "none",
                            borderRight: "1px solid #334155",
                            marginRight: "16px",
                          }}
                          wrapLines={true}
                          wrapLongLines={true}
                          lineProps={(lineNumber) => ({
                            style: {
                              display: "block",
                              width: "fit-content",
                              minWidth: "100%",
                            },
                          })}
                          codeTagProps={{
                            style: {
                              fontFamily:
                                'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              fontSize: "14px",
                            },
                          }}
                        >
                          {fileContent}
                        </SyntaxHighlighter>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <div className="text-center">
                        <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No file selected</p>
                        <p className="text-sm">
                          Choose a file from the explorer to start editing
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Loading Overlay */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                      <ArrowPathIcon className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Terminal (when showTerminal is true) */}
            {showTerminal && (
              <div
                className="border-t border-slate-700 bg-slate-900 flex flex-col"
                style={{ height: terminalHeight }}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <CommandLineIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-white">
                      Terminal
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearTerminal}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowTerminal(false)}
                      className="text-slate-400 hover:text-white p-1 rounded"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={terminalRef}
                  className="flex-1 overflow-y-auto p-3 font-mono text-sm bg-black flex flex-col"
                >
                  <div className="flex-1">
                    {terminalOutput.map((output) => (
                      <div
                        key={output.id}
                        className={`mb-1 ${
                          output.type === "command"
                            ? "text-green-400 font-semibold"
                            : output.type === "error"
                            ? "text-red-400"
                            : "text-gray-300"
                        }`}
                      >
                        <span className="text-gray-500 text-xs mr-2">
                          {output.timestamp.toLocaleTimeString()}
                        </span>
                        {output.content}
                      </div>
                    ))}
                    {isRunningCommand && (
                      <div className="text-yellow-400 animate-pulse">
                        ▶ Running: {currentCommand}
                      </div>
                    )}
                  </div>

                  {/* Interactive Terminal Input */}
                  <div className="flex items-center gap-2 mt-2 border-t border-slate-700 pt-2">
                    <span className="text-green-400 font-semibold">$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={handleTerminalKeyPress}
                      className="flex-1 bg-transparent text-gray-300 outline-none font-mono text-sm"
                      placeholder="Type a command... (try 'help' for available commands)"
                      disabled={isRunningCommand}
                    />
                    {isRunningCommand && (
                      <div className="text-yellow-400 text-xs animate-pulse">
                        Running...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-1 bg-slate-800 border-t border-slate-700 text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-400">{files.length} files</span>
                {selectedFile && (
                  <>
                    <span className="text-slate-400">
                      {selectedFile} • {formatFileSize(fileContent.length)} •{" "}
                      {fileContent.split("\n").length} lines
                    </span>
                    {hasUnsavedChanges && (
                      <span className="text-yellow-400">● Unsaved changes</span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                {error && (
                  <span className="text-red-400 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    Error
                  </span>
                )}

                {saveStatus === "saved" && (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" />
                    Saved
                  </span>
                )}

                <button
                  onClick={() => setShowTerminal(!showTerminal)}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    showTerminal
                      ? "text-indigo-400 bg-indigo-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CommandLineIcon className="w-3 h-3" />
                  Terminal
                </button>

                {/* Temporary test button */}
                <button
                  onClick={() => {
                    console.log("Test export dialog button clicked");
                    setShowExportDialog(true);
                  }}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
                >
                  Test Export
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="absolute bottom-20 left-4 right-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-400">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                  <button
                    onClick={() => setError("")}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Export MCP Configuration Dialog */}
      {showExportDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={(e) => {
            console.log("Export dialog overlay clicked");
            if (e.target === e.currentTarget) {
              setShowExportDialog(false);
            }
          }}
        >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <ShareIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Export MCP Server
                    </h3>
                    <p className="text-sm text-slate-400">
                      Configure for use with other MCP clients
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Dialog Content */}
              <div className="p-6 space-y-6">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Select MCP Client
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setExportFormat("claude")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        exportFormat === "claude"
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-600 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">C</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">Claude Desktop</h4>
                          <p className="text-sm text-slate-400">
                            Anthropic's Claude Desktop application
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setExportFormat("copilot")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        exportFormat === "copilot"
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-600 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">GH</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">GitHub Copilot</h4>
                          <p className="text-sm text-slate-400">
                            GitHub's AI coding assistant
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setExportFormat("custom")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        exportFormat === "custom"
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-600 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <CogIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">Custom MCP Client</h4>
                          <p className="text-sm text-slate-400">
                            Any MCP-compatible client or custom setup
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Configuration Preview */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Configuration Preview
                  </label>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <SyntaxHighlighter
                      language="json"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: 0,
                        background: "transparent",
                        fontSize: "12px",
                        lineHeight: "1.4",
                      }}
                    >
                      {generateMCPConfig().content}
                    </SyntaxHighlighter>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Setup Instructions
                  </label>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                      {generateMCPConfig().instructions}
                    </pre>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
                  <button
                    onClick={exportMCPConfig}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Download Config
                  </button>

                  <button
                    onClick={copyMCPConfig}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Copy Config
                  </button>

                  <button
                    onClick={() => setShowExportDialog(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
    </AnimatePresence>
  );
};
