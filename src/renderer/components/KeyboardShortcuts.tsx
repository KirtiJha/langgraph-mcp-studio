import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CommandLineIcon,
  XMarkIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

interface KeyboardShortcut {
  key: string;
  description: string;
  action: string;
  category: string;
}

interface KeyboardShortcutsProps {
  onAction?: (action: string) => void;
}

const shortcuts: KeyboardShortcut[] = [
  {
    key: "Cmd+1",
    description: "Switch to Servers",
    action: "switch-servers",
    category: "Navigation",
  },
  {
    key: "Cmd+2",
    description: "Switch to Tools",
    action: "switch-tools",
    category: "Navigation",
  },
  {
    key: "Cmd+3",
    description: "Switch to Chat",
    action: "switch-chat",
    category: "Navigation",
  },
  {
    key: "Cmd+4",
    description: "Switch to Resources",
    action: "switch-resources",
    category: "Navigation",
  },
  {
    key: "Cmd+5",
    description: "Switch to Logs",
    action: "switch-logs",
    category: "Navigation",
  },
  {
    key: "Cmd+N",
    description: "Add New Server",
    action: "add-server",
    category: "Actions",
  },
  {
    key: "Cmd+R",
    description: "Refresh All",
    action: "refresh",
    category: "Actions",
  },
  {
    key: "Cmd+,",
    description: "Open Settings",
    action: "open-settings",
    category: "Actions",
  },
  {
    key: "Cmd+K",
    description: "Show Shortcuts",
    action: "show-shortcuts",
    category: "Help",
  },
  {
    key: "Cmd+/",
    description: "Show Help",
    action: "show-help",
    category: "Help",
  },
  {
    key: "Escape",
    description: "Close Modal/Panel",
    action: "close-modal",
    category: "General",
  },
  {
    key: "Enter",
    description: "Confirm Action",
    action: "confirm",
    category: "General",
  },
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onAction,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? event.metaKey : event.ctrlKey;

      // Handle keyboard shortcuts
      if (cmdKey) {
        switch (event.key) {
          case "1":
            event.preventDefault();
            onAction?.("switch-servers");
            break;
          case "2":
            event.preventDefault();
            onAction?.("switch-tools");
            break;
          case "3":
            event.preventDefault();
            onAction?.("switch-chat");
            break;
          case "4":
            event.preventDefault();
            onAction?.("switch-resources");
            break;
          case "5":
            event.preventDefault();
            onAction?.("switch-logs");
            break;
          case "n":
            event.preventDefault();
            onAction?.("add-server");
            break;
          case "r":
            event.preventDefault();
            onAction?.("refresh");
            break;
          case ",":
            event.preventDefault();
            onAction?.("open-settings");
            break;
          case "k":
            event.preventDefault();
            setIsVisible(true);
            break;
          case "/":
            event.preventDefault();
            onAction?.("show-help");
            break;
        }
      }

      if (event.key === "Escape") {
        if (isVisible) {
          setIsVisible(false);
        } else {
          onAction?.("close-modal");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onAction, isVisible]);

  const filteredShortcuts = shortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsVisible(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <KeyIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">
                      Keyboard Shortcuts
                    </h2>
                    <p className="text-slate-400 text-sm">
                      Navigate MCP Studio faster with shortcuts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-2 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Search shortcuts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Shortcuts List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {Object.entries(groupedShortcuts).map(
                  ([category, categoryShortcuts]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {categoryShortcuts.map((shortcut) => (
                          <motion.div
                            key={shortcut.action}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors duration-200"
                          >
                            <span className="text-slate-200">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center space-x-1">
                              {shortcut.key.split("+").map((key, index) => (
                                <React.Fragment key={index}>
                                  {index > 0 && (
                                    <span className="text-slate-500 text-xs">
                                      +
                                    </span>
                                  )}
                                  <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs font-mono text-slate-300">
                                    {key}
                                  </kbd>
                                </React.Fragment>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {filteredShortcuts.length === 0 && (
                  <div className="text-center py-8">
                    <CommandLineIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No shortcuts found</p>
                    <p className="text-slate-500 text-sm">
                      Try a different search term
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>
                  Press{" "}
                  <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">
                    Esc
                  </kbd>{" "}
                  to close
                </span>
                <span>{filteredShortcuts.length} shortcuts</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcuts;
