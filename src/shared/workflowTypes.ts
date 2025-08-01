// Workflow Type Definitions
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: {
    created: Date;
    modified: Date;
    version: string;
    tags: string[];
  };
}

export interface WorkflowNode {
  id: string;
  type:
    | "server"
    | "tool"
    | "conditional"
    | "loop"
    | "start"
    | "end"
    | "parallel"
    | "aggregator"
    | "transform";
  position: { x: number; y: number };
  data: {
    label?: string;
    serverId?: string;
    serverName?: string;
    toolName?: string;
    selectedTools?: string[];
    condition?: string;
    conditionType?: "javascript" | "simple" | "jq";
    parameters?: Record<string, any>;
    loopCondition?: string;
    maxIterations?: number;
    transformScript?: string;
    description?: string;
    timeout?: number;
    retryCount?: number;
    continueOnError?: boolean;
    // Parallel execution settings
    parallelBranches?: string[];
    // Aggregator settings
    aggregationType?: "merge" | "array" | "first" | "last" | "custom";
    aggregationScript?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: "default" | "conditional" | "loop" | "parallel";
  data?: {
    condition?: string;
    label?: string;
    conditionType?: "success" | "error" | "custom";
  };
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  currentNodeId: string;
  nodeResults: Record<string, any>;
  globalVariables: Record<string, any>;
  executionPath: string[];
  startTime: Date;
  status: "running" | "completed" | "error" | "paused";
  error?: string;
  iterationCount?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "running" | "completed" | "error" | "paused";
  startTime: Date;
  endTime?: Date;
  currentNodeId?: string;
  nodeExecutions: NodeExecution[];
  finalResult?: any;
  error?: string;
}

export interface NodeExecution {
  nodeId: string;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  startTime?: Date;
  endTime?: Date;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
  duration?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  workflow: Omit<WorkflowDefinition, "id" | "metadata">;
  tags: string[];
}

// Node type definitions for UI components
export interface NodeTypeDefinition {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: "basic" | "control" | "data" | "advanced";
  inputs: number; // -1 for unlimited
  outputs: number; // -1 for unlimited
  configurable: boolean;
}

// Workflow validation
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: "node" | "edge" | "workflow";
  nodeId?: string;
  edgeId?: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  type: "node" | "edge" | "workflow";
  nodeId?: string;
  edgeId?: string;
  message: string;
  suggestion?: string;
}

// Workflow execution events
export interface WorkflowEvent {
  type:
    | "execution_started"
    | "node_started"
    | "node_completed"
    | "node_error"
    | "execution_completed"
    | "execution_error";
  workflowId: string;
  executionId: string;
  nodeId?: string;
  timestamp: Date;
  data?: any;
}
