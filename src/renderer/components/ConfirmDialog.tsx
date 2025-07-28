import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
}) => {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onCancel}
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
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-700">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      destructive ? "bg-red-500/20" : "bg-yellow-500/20"
                    }`}
                  >
                    <ExclamationTriangleIcon
                      className={`w-6 h-6 ${
                        destructive ? "text-red-400" : "text-yellow-400"
                      }`}
                    />
                  </div>
                  <h2 className="text-xl font-semibold text-zinc-100">
                    {title}
                  </h2>
                </div>
                <button
                  onClick={onCancel}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors duration-200"
                  aria-label="Close dialog"
                >
                  <XMarkIcon className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-zinc-300 leading-relaxed">{message}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-zinc-700 bg-zinc-900/50">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 
                           hover:bg-zinc-800 rounded-lg transition-all duration-200"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 
                           flex items-center space-x-2 ${
                             destructive
                               ? "bg-red-500 text-white hover:bg-red-600"
                               : "bg-blue-500 text-white hover:bg-blue-600"
                           }`}
                >
                  <span>{confirmText}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
