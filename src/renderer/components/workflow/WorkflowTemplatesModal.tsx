import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  XMarkIcon,
  PlayIcon,
  ClockIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { WorkflowDefinition } from "../../../shared/workflowTypes";

interface WorkflowTemplatesModalProps {
  onCreateFromTemplate: (template: WorkflowDefinition) => void;
  onClose: () => void;
}

const WORKFLOW_TEMPLATES: WorkflowDefinition[] = [
  {
    id: "data-pipeline",
    name: "Data Processing Pipeline",
    description: "A template for processing data through multiple stages",
    metadata: {
      created: new Date(),
      modified: new Date(),
      version: "1.0.0",
      tags: ["data", "pipeline", "processing"],
    },
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 100 },
        data: {
          label: "Start",
        },
      },
      {
        id: "fetch-data",
        type: "server",
        position: { x: 300, y: 100 },
        data: {
          label: "Fetch Data",
          serverId: "",
          serverName: "Data Source",
          parameters: {},
        },
      },
      {
        id: "process",
        type: "tool",
        position: { x: 500, y: 100 },
        data: {
          label: "Process Data",
          toolName: "transform",
          parameters: {},
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 700, y: 100 },
        data: {
          label: "End",
        },
      },
    ],
    edges: [
      {
        id: "start-fetch",
        source: "start",
        target: "fetch-data",
        type: "default",
      },
      {
        id: "fetch-process",
        source: "fetch-data",
        target: "process",
        type: "default",
      },
      {
        id: "process-end",
        source: "process",
        target: "end",
        type: "default",
      },
    ],
  },
  {
    id: "conditional-flow",
    name: "Conditional Processing",
    description: "A workflow with conditional branches based on data",
    metadata: {
      created: new Date(),
      modified: new Date(),
      version: "1.0.0",
      tags: ["conditional", "branching", "logic"],
    },
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 200 },
        data: {
          label: "Start",
        },
      },
      {
        id: "validate",
        type: "tool",
        position: { x: 300, y: 200 },
        data: {
          label: "Validate Input",
          toolName: "validate",
          parameters: {},
        },
      },
      {
        id: "condition",
        type: "conditional",
        position: { x: 500, y: 200 },
        data: {
          label: "Is Valid?",
          condition: "input.isValid === true",
          description: "Check if data is valid",
        },
      },
      {
        id: "process-valid",
        type: "tool",
        position: { x: 600, y: 100 },
        data: {
          label: "Process Valid Data",
          toolName: "process",
          parameters: {},
        },
      },
      {
        id: "handle-invalid",
        type: "tool",
        position: { x: 600, y: 300 },
        data: {
          label: "Handle Invalid Data",
          toolName: "errorHandler",
          parameters: {},
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 800, y: 200 },
        data: {
          label: "End",
        },
      },
    ],
    edges: [
      {
        id: "start-validate",
        source: "start",
        target: "validate",
        type: "default",
      },
      {
        id: "validate-condition",
        source: "validate",
        target: "condition",
        type: "default",
      },
      {
        id: "condition-valid",
        source: "condition",
        target: "process-valid",
        type: "conditional",
        data: { condition: "true" },
      },
      {
        id: "condition-invalid",
        source: "condition",
        target: "handle-invalid",
        type: "conditional",
        data: { condition: "false" },
      },
      {
        id: "valid-end",
        source: "process-valid",
        target: "end",
        type: "default",
      },
      {
        id: "invalid-end",
        source: "handle-invalid",
        target: "end",
        type: "default",
      },
    ],
  },
  {
    id: "parallel-processing",
    name: "Parallel Processing",
    description:
      "Process multiple data streams in parallel and aggregate results",
    metadata: {
      created: new Date(),
      modified: new Date(),
      version: "1.0.0",
      tags: ["parallel", "concurrent", "aggregation"],
    },
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 100, y: 200 },
        data: {
          label: "Start",
        },
      },
      {
        id: "split",
        type: "parallel",
        position: { x: 300, y: 200 },
        data: {
          label: "Split Data",
          parallelBranches: ["branch1", "branch2", "branch3"],
          description: "Split data into parallel streams",
        },
      },
      {
        id: "process-1",
        type: "tool",
        position: { x: 500, y: 100 },
        data: {
          label: "Process Stream 1",
          toolName: "processA",
          parameters: {},
        },
      },
      {
        id: "process-2",
        type: "tool",
        position: { x: 500, y: 200 },
        data: {
          label: "Process Stream 2",
          toolName: "processB",
          parameters: {},
        },
      },
      {
        id: "process-3",
        type: "tool",
        position: { x: 500, y: 300 },
        data: {
          label: "Process Stream 3",
          toolName: "processC",
          parameters: {},
        },
      },
      {
        id: "aggregate",
        type: "aggregator",
        position: { x: 700, y: 200 },
        data: {
          label: "Aggregate Results",
          aggregationType: "merge",
          description: "Combine all results",
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 900, y: 200 },
        data: {
          label: "End",
        },
      },
    ],
    edges: [
      {
        id: "start-split",
        source: "start",
        target: "split",
        type: "default",
      },
      {
        id: "split-process1",
        source: "split",
        target: "process-1",
        type: "parallel",
      },
      {
        id: "split-process2",
        source: "split",
        target: "process-2",
        type: "parallel",
      },
      {
        id: "split-process3",
        source: "split",
        target: "process-3",
        type: "parallel",
      },
      {
        id: "process1-aggregate",
        source: "process-1",
        target: "aggregate",
        type: "default",
      },
      {
        id: "process2-aggregate",
        source: "process-2",
        target: "aggregate",
        type: "default",
      },
      {
        id: "process3-aggregate",
        source: "process-3",
        target: "aggregate",
        type: "default",
      },
      {
        id: "aggregate-end",
        source: "aggregate",
        target: "end",
        type: "default",
      },
    ],
  },
];

const WorkflowTemplatesModal: React.FC<WorkflowTemplatesModalProps> = ({
  onCreateFromTemplate,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowDefinition | null>(null);

  const handleCreateFromTemplate = () => {
    console.log(
      "handleCreateFromTemplate called, selectedTemplate:",
      selectedTemplate
    );
    if (selectedTemplate) {
      // Create a new workflow with unique ID
      const newWorkflow: WorkflowDefinition = {
        ...selectedTemplate,
        id: `workflow-${Date.now()}`,
        name: `${selectedTemplate.name} (Copy)`,
        metadata: {
          ...selectedTemplate.metadata,
          created: new Date(),
          modified: new Date(),
        },
      };
      console.log("Calling onCreateFromTemplate with:", newWorkflow);
      onCreateFromTemplate(newWorkflow);
    } else {
      console.log("No template selected");
    }
  };

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case "data-pipeline":
        return <PlayIcon className="w-6 h-6" />;
      case "conditional-flow":
        return <CogIcon className="w-6 h-6" />;
      case "parallel-processing":
        return <ClockIcon className="w-6 h-6" />;
      default:
        return <PlayIcon className="w-6 h-6" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-4xl max-w-4xl max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-200">
            Workflow Templates
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {WORKFLOW_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedTemplate?.id === template.id
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
              }`}
              onClick={() => {
                console.log("Template clicked:", template.name);
                setSelectedTemplate(template);
              }}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    selectedTemplate?.id === template.id
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {getTemplateIcon(template.id)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-200 mb-1">
                    {template.name}
                  </h3>
                  <p className="text-sm text-slate-400 mb-2">
                    {template.description}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                    <span>{template.nodes.length} nodes</span>
                    <span>{template.edges.length} connections</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
          >
            <h4 className="font-medium text-slate-200 mb-2">
              {selectedTemplate.name}
            </h4>
            <p className="text-sm text-slate-400 mb-3">
              {selectedTemplate.description}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Nodes:</span>
                <span className="ml-2 text-slate-300">
                  {selectedTemplate.nodes.length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Connections:</span>
                <span className="ml-2 text-slate-300">
                  {selectedTemplate.edges.length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Version:</span>
                <span className="ml-2 text-slate-300">
                  {selectedTemplate.metadata.version}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Tags:</span>
                <span className="ml-2 text-slate-300">
                  {selectedTemplate.metadata.tags.join(", ")}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateFromTemplate}
            disabled={!selectedTemplate}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTemplate
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
          >
            Create from Template
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkflowTemplatesModal;
