import React from "react";
import { motion } from "framer-motion";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  CommandLineIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  isProcessingQuery: boolean;
  isTyping: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesCount: number;
}

const suggestedCommands = [
  {
    text: "analyze workflow",
    icon: LightBulbIcon,
    description: "Get insights about the workflow",
  },
  {
    text: "execute workflow",
    icon: CommandLineIcon,
    description: "Run the entire workflow",
  },
  {
    text: "status",
    icon: SparklesIcon,
    description: "Check current execution status",
  },
  {
    text: "help",
    icon: LightBulbIcon,
    description: "Get help and available commands",
  },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  setInputValue,
  handleSendMessage,
  handleKeyPress,
  isProcessingQuery,
  isTyping,
  inputRef,
  messagesCount,
}) => {
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const handleSuggestionClick = (command: string) => {
    setInputValue(command);
    setShowSuggestions(false);
    // Focus input after suggestion click
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm">
      {/* Suggestions */}
      {showSuggestions && messagesCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="p-4 border-b border-slate-700/50"
        >
          <div className="text-xs text-slate-400 mb-2">Try these commands:</div>
          <div className="grid grid-cols-2 gap-2">
            {suggestedCommands.map((cmd, index) => (
              <motion.button
                key={cmd.text}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSuggestionClick(cmd.text)}
                className="p-2 text-left bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-lg transition-all duration-200 group"
              >
                <div className="flex items-center space-x-2">
                  <cmd.icon className="w-3 h-3 text-slate-400 group-hover:text-purple-400 transition-colors" />
                  <span className="text-xs text-slate-300 group-hover:text-slate-200 font-medium">
                    {cmd.text}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {cmd.description}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="p-4">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Ask a question or give a command - I'll process it through your workflow intelligently..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 hover:border-slate-500 focus:border-purple-500 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 pr-12"
            />

            {/* Character count or status indicator */}
            {inputValue.length > 50 && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                {inputValue.length}
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping || isProcessingQuery}
            className={`px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center min-w-[3rem] ${
              isProcessingQuery
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25"
                : inputValue.trim()
                ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            } disabled:opacity-50`}
            title={
              isProcessingQuery
                ? "Processing through workflow..."
                : inputValue.trim()
                ? "Send message"
                : "Type a message first"
            }
          >
            {isProcessingQuery ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5"
              >
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              </motion.div>
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </motion.button>
        </div>

        {/* Footer Info */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4 text-slate-500">
            <div className="flex items-center space-x-1">
              <SparklesIcon className="w-3 h-3" />
              <span>AI-powered workflow assistant</span>
            </div>
            {isProcessingQuery && (
              <div className="flex items-center space-x-1 text-amber-400">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 bg-amber-400 rounded-full"
                />
                <span>Processing query through workflow...</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 text-slate-500">
            <span>{messagesCount} messages</span>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded text-xs">
                Enter
              </kbd>
              <span>to send</span>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        {messagesCount === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <LightBulbIcon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-200">
                <div className="font-medium mb-1">Quick Tips:</div>
                <ul className="space-y-1 text-purple-300/80">
                  <li>
                    • Ask me to "execute workflow" to run your entire process
                  </li>
                  <li>
                    • Use "analyze" to get insights about your workflow
                    structure
                  </li>
                  <li>• Check "status" to see current execution state</li>
                  <li>• I can help optimize and troubleshoot your workflows</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
