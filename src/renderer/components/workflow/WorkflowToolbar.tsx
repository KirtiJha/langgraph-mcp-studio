import React from "react";
import { motion } from "framer-motion";
import {
  PlayIcon,
  StopIcon,
  DocumentArrowDownIcon as SaveIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { WorkflowDefinition } from "../../../shared/workflowTypes";

interface WorkflowToolbarProps {
  workflow: WorkflowDefinition;
  isExecuting?: boolean;
  validationErrors?: any[];
  onExecute: () => void;
  onSave: () => void;
  onValidate: () => boolean;
  onShowSettings: () => void;
  onTogglePalette: () => void;
  onToggleExecution: () => void;
}

const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  workflow,
  isExecuting = false,
  validationErrors = [],
  onExecute,
  onSave,
  onValidate,
  onShowSettings,
  onTogglePalette,
  onToggleExecution,
}) => {
  const isValid = validationErrors.length === 0;

  return (
    <div className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-6">
      {/* Left: Workflow Info */}
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-200">
            {workflow.name}
          </h1>
          <p className="text-xs text-slate-400">
            {workflow.nodes.length} nodes, {workflow.edges.length} connections
          </p>
        </div>

        {/* Validation Status */}
        <div className="flex items-center space-x-2">
          {isValid ? (
            <div className="flex items-center space-x-1 text-emerald-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span className="text-xs">Valid</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-400">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span className="text-xs">{validationErrors.length} errors</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-3">
        {/* Toggle Palette */}
        <button
          onClick={onTogglePalette}
          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          title="Toggle node palette"
        >
          <EyeIcon className="w-5 h-5" />
        </button>

        {/* Toggle Execution Panel */}
        <button
          onClick={onToggleExecution}
          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          title="Toggle execution panel"
        >
          <EyeSlashIcon className="w-5 h-5" />
        </button>

        {/* Validate */}
        <button
          onClick={onValidate}
          className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
        >
          Validate
        </button>

        {/* Save */}
        <button
          onClick={onSave}
          className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center space-x-2"
        >
          <SaveIcon className="w-4 h-4" />
          <span>Save</span>
        </button>

        {/* Execute */}
        <button
          onClick={onExecute}
          disabled={isExecuting || !isValid}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all ${
            isExecuting || !isValid
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          }`}
        >
          {isExecuting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" />
              <span>Execute</span>
            </>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onShowSettings}
          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          title="Workflow settings"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default WorkflowToolbar;
