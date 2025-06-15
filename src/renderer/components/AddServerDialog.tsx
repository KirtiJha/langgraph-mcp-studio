import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  ServerIcon,
  CommandLineIcon,
  FolderIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface AddServerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (serverConfig: ServerConfig) => void;
}

interface ServerConfig {
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

const AddServerDialog: React.FC<AddServerDialogProps> = ({
  open,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [cwd, setCwd] = useState("");
  const [env, setEnv] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Server name is required";
    }

    if (!command.trim()) {
      newErrors.command = "Command is required";
    }

    // Validate environment variables format
    if (env.trim()) {
      try {
        const envLines = env.split('\n').filter(line => line.trim());
        for (const line of envLines) {
          if (!line.includes('=')) {
            newErrors.env = "Environment variables must be in KEY=value format";
            break;
          }
        }
      } catch (error) {
        newErrors.env = "Invalid environment variables format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Parse arguments
    const parsedArgs = args.trim() 
      ? args.split(' ').filter(arg => arg.trim())
      : [];

    // Parse environment variables
    const parsedEnv: Record<string, string> = {};
    if (env.trim()) {
      const envLines = env.split('\n').filter(line => line.trim());
      for (const line of envLines) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          parsedEnv[key.trim()] = valueParts.join('=').trim();
        }
      }
    }

    const serverConfig: ServerConfig = {
      name: name.trim(),
      command: command.trim(),
      args: parsedArgs,
      ...(cwd.trim() && { cwd: cwd.trim() }),
      ...(Object.keys(parsedEnv).length > 0 && { env: parsedEnv }),
    };

    onAdd(serverConfig);
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setCommand("");
    setArgs("");
    setCwd("");
    setEnv("");
    setErrors({});
    onClose();
  };

  const inputClasses = `
    w-full px-4 py-3 rounded-lg border bg-zinc-900 border-zinc-700 
    text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 
    focus:ring-blue-500 focus:border-transparent transition-all duration-200
  `;

  const errorInputClasses = `
    w-full px-4 py-3 rounded-lg border bg-zinc-900 border-red-500 
    text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 
    focus:ring-red-500 focus:border-transparent transition-all duration-200
  `;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <ServerIcon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-zinc-100">
                    Add MCP Server
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors duration-200"
                >
                  <XMarkIcon className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Server Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My MCP Server"
                    className={errors.name ? errorInputClasses : inputClasses}
                  />
                  {errors.name && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 mt-2 text-red-400 text-sm"
                    >
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>{errors.name}</span>
                    </motion.div>
                  )}
                </div>

                {/* Command */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Command *
                  </label>
                  <div className="relative">
                    <CommandLineIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="e.g., python, node, /path/to/executable"
                      className={`pl-12 ${errors.command ? errorInputClasses : inputClasses}`}
                    />
                  </div>
                  {errors.command && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 mt-2 text-red-400 text-sm"
                    >
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>{errors.command}</span>
                    </motion.div>
                  )}
                </div>

                {/* Arguments */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Arguments
                  </label>
                  <input
                    type="text"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="e.g., -m mcp_server --port 3000"
                    className={inputClasses}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Space-separated command line arguments
                  </p>
                </div>

                {/* Working Directory */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Working Directory
                  </label>
                  <div className="relative">
                    <FolderIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={cwd}
                      onChange={(e) => setCwd(e.target.value)}
                      placeholder="e.g., /path/to/server/directory"
                      className={`pl-12 ${inputClasses}`}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Optional: Directory to run the command from
                  </p>
                </div>

                {/* Environment Variables */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Environment Variables
                  </label>
                  <textarea
                    value={env}
                    onChange={(e) => setEnv(e.target.value)}
                    placeholder="API_KEY=your_key_here&#10;DEBUG=true&#10;PORT=3000"
                    rows={4}
                    className={`resize-none ${errors.env ? errorInputClasses : inputClasses}`}
                  />
                  {errors.env && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 mt-2 text-red-400 text-sm"
                    >
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>{errors.env}</span>
                    </motion.div>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">
                    One per line in KEY=value format
                  </p>
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-zinc-700 bg-zinc-900/50">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 
                           hover:bg-zinc-800 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 
                           hover:bg-blue-700 rounded-lg transition-all duration-200 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                           focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!name.trim() || !command.trim()}
                >
                  Add Server
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddServerDialog;
