import { LangGraphAgent } from "./LangGraphAgent";
import { MCPManager } from "../mcp/MCPManager";
import { ModelService } from "../services/ModelService";
import {
  WorkflowDefinition,
  WorkflowExecution,
  NodeExecution,
  ExecutionContext,
  WorkflowEvent,
} from "../../shared/workflowTypes";

export interface WorkflowExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  continueOnError?: boolean;
  debugMode?: boolean;
}

export interface WorkflowChatResponse {
  nodeId: string;
  nodeType: string;
  message: string;
  toolCalls?: Array<{
    name: string;
    args: any;
    result?: any;
    status?: "executing" | "completed" | "failed";
    duration?: number;
    serverId?: string;
  }>;
  timestamp: Date;
  nextNodeId?: string;
  isComplete?: boolean;
  isNodeComplete?: boolean; // Flag to indicate this specific node completed
  conditionResult?: boolean; // For conditional nodes
}

export class WorkflowAgent extends LangGraphAgent {
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private eventListeners: Map<string, (event: WorkflowEvent) => void> =
    new Map();

  constructor(mcpManager: MCPManager, modelService: ModelService) {
    super(mcpManager, modelService);
  }

  /**
   * Process a query through workflow with chat-style responses
   */
  async processQueryThroughWorkflow(
    workflow: WorkflowDefinition,
    query: string,
    onChatResponse?: (response: WorkflowChatResponse) => void
  ): Promise<WorkflowChatResponse[]> {
    const responses: WorkflowChatResponse[] = [];

    // Find start node
    const startNode = workflow.nodes.find((node) => node.type === "start");
    if (!startNode) {
      throw new Error("Workflow must have a start node");
    }

    // Initialize execution context
    const context: ExecutionContext = {
      workflowId: workflow.id,
      executionId: `chat_${Date.now()}`,
      currentNodeId: startNode.id,
      nodeResults: { __initial: { userQuery: query } },
      globalVariables: {},
      executionPath: [],
      startTime: new Date(),
      status: "running",
    };

    let currentNode = startNode;
    let processedQuery = query;

    while (currentNode) {
      // Send node start message
      if (onChatResponse) {
        const startMessage: WorkflowChatResponse = {
          nodeId: currentNode.id,
          nodeType: currentNode.type,
          message: `📍 **Starting ${
            currentNode.data?.label || currentNode.type
          }**\n\nProcessing your query...`,
          timestamp: new Date(),
          isNodeComplete: false,
          isComplete: false,
        };
        onChatResponse(startMessage);
      }

      // Process the node and get the result
      const response = await this.processNodeForChat(
        currentNode,
        processedQuery,
        workflow,
        context
      );

      // Mark this response as node complete
      response.isNodeComplete = true;

      responses.push(response);

      // Emit the completion response if callback provided
      if (onChatResponse) {
        onChatResponse(response);
      }

      // Update context
      context.nodeResults[currentNode.id] = response;
      context.executionPath.push(currentNode.id);

      // Check if workflow is complete
      if (response.isComplete || currentNode.type === "end") {
        break;
      }

      // Find next node
      const nextNodeId = this.findNextNode(currentNode, workflow, response);
      if (!nextNodeId) {
        break;
      }

      const nextNode = workflow.nodes.find((node) => node.id === nextNodeId);
      if (!nextNode) {
        break;
      }
      currentNode = nextNode;

      // Transform query for next node if needed
      if (currentNode) {
        processedQuery = await this.transformQueryForNode(
          query,
          currentNode,
          response,
          context
        );
      }
    }

    return responses;
  }

  /**
   * Process a single node for chat response
   */
  private async processNodeForChat(
    node: any,
    query: string,
    workflow: WorkflowDefinition,
    context: ExecutionContext
  ): Promise<WorkflowChatResponse> {
    const baseResponse: WorkflowChatResponse = {
      nodeId: node.id,
      nodeType: node.type,
      message: "",
      timestamp: new Date(),
    };

    try {
      switch (node.type) {
        case "start":
          return await this.processStartNodeForChat(node, query, context);

        case "server":
          return await this.processServerNodeForChat(node, query, context);

        case "tool":
          return await this.processToolNodeForChat(node, query, context);

        case "conditional":
          return await this.processConditionalNodeForChat(node, query, context);

        case "transform":
          return await this.processTransformNodeForChat(node, query, context);

        case "end":
          return await this.processEndNodeForChat(node, query, context);

        default:
          return {
            ...baseResponse,
            message: `Processing ${node.type} node: ${
              node.data?.label || node.id
            }`,
          };
      }
    } catch (error) {
      return {
        ...baseResponse,
        message: `Error processing node: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Process start node for chat
   */
  private async processStartNodeForChat(
    node: any,
    query: string,
    context: ExecutionContext
  ): Promise<WorkflowChatResponse> {
    return {
      nodeId: node.id,
      nodeType: "start",
      message: `🚀 Starting workflow with your query: "${query}"`,
      timestamp: new Date(),
    };
  }

  /**
   * Process server node for chat
   */
  private async processServerNodeForChat(
    node: any,
    query: string,
    context: ExecutionContext
  ): Promise<WorkflowChatResponse> {
    const { serverId, selectedTools } = node.data;

    if (!serverId) {
      return {
        nodeId: node.id,
        nodeType: "server",
        message: "❌ Server node is not configured properly",
        timestamp: new Date(),
      };
    }

    // Create contextual prompt for the server node
    const contextualPrompt = `You are processing a workflow node of type "server" with the following configuration:

Server ID: ${serverId}
Selected Tools: ${
      selectedTools ? selectedTools.join(", ") : "all available tools"
    }
User Query: "${query}"
Previous Results: ${JSON.stringify(context.nodeResults)}

Please use the available MCP server tools to fulfill this request. Focus on using tools from the "${serverId}" server if available. Provide a conversational response explaining what you're doing and the results.`;

    // Call the parent LangGraphAgent's processMessage method
    const llmResponse = await this.processMessage(contextualPrompt);

    // Create a detailed message showing both LLM response and tool execution results
    let detailedMessage = `🔧 **${node.data?.label || "Server Node"}**\n\n`;

    // Add tool execution results if any
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      detailedMessage += "**Tool Executions:**\n";
      llmResponse.toolCalls.forEach((call, index) => {
        detailedMessage += `\n${index + 1}. **${call.name}**\n`;
        detailedMessage += `   Args: ${JSON.stringify(call.args, null, 2)}\n`;
        if (call.result) {
          detailedMessage += `   Result: ${JSON.stringify(
            call.result,
            null,
            2
          )}\n`;
        }
      });
      detailedMessage += "\n---\n\n";
    }

    // Add LLM response
    detailedMessage += `**AI Response:**\n${llmResponse.content}`;

    return {
      nodeId: node.id,
      nodeType: "server",
      message: detailedMessage,
      toolCalls:
        llmResponse.toolCalls?.map((call) => ({
          name: call.name,
          args: call.args,
          result: call.result,
          status: "completed" as const,
          serverId,
        })) || [],
      timestamp: new Date(),
    };
  }

  /**
   * Process tool node for chat
   */
  private async processToolNodeForChat(
    node: any,
    query: string,
    context: ExecutionContext
  ): Promise<WorkflowChatResponse> {
    const { serverId, toolName, parameters } = node.data;

    if (!serverId || !toolName) {
      return {
        nodeId: node.id,
        nodeType: "tool",
        message: "❌ Tool node requires both server and tool to be selected",
        timestamp: new Date(),
      };
    }

    const contextualPrompt = `You need to execute a specific tool with the following configuration:

Server ID: ${serverId}
Tool Name: ${toolName}
Parameters: ${JSON.stringify(parameters || {})}
User Query: "${query}"
Previous Results: ${JSON.stringify(context.nodeResults)}

Please execute the "${toolName}" tool from the "${serverId}" server with the provided parameters. Provide a conversational response explaining what you're doing and the results.`;

    const llmResponse = await this.processMessage(contextualPrompt);

    // Create a detailed message showing tool execution
    let detailedMessage = `🛠️ **${node.data?.label || toolName}**\n\n`;

    // Add tool execution details
    detailedMessage += "**Tool Execution:**\n";
    detailedMessage += `Tool: ${toolName}\n`;
    detailedMessage += `Server: ${serverId}\n`;
    detailedMessage += `Parameters: ${JSON.stringify(
      parameters || {},
      null,
      2
    )}\n\n`;

    // Add actual tool results if available
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      detailedMessage += "**Execution Results:**\n";
      llmResponse.toolCalls.forEach((call, index) => {
        detailedMessage += `${index + 1}. ${call.name}: ${JSON.stringify(
          call.result,
          null,
          2
        )}\n`;
      });
      detailedMessage += "\n";
    }

    detailedMessage += `**AI Response:**\n${llmResponse.content}`;

    return {
      nodeId: node.id,
      nodeType: "tool",
      message: detailedMessage,
      toolCalls: llmResponse.toolCalls?.map((call) => ({
        name: call.name,
        args: call.args,
        result: call.result,
        status: "completed" as const,
        serverId,
      })) || [
        {
          name: toolName,
          args: parameters || {},
          result: llmResponse.content,
          status: "completed" as const,
          serverId,
        },
      ],
      timestamp: new Date(),
    };
  }

  /**
   * Process conditional node for chat
   */
  private async processConditionalNodeForChat(
    node: any,
    query: string,
    context: ExecutionContext
  ): Promise<WorkflowChatResponse> {
    const { condition, conditionType } = node.data;

    if (!condition) {
      return {
        nodeId: node.id,
        nodeType: "conditional",
        message: "❌ Conditional node must have a condition defined",
        timestamp: new Date(),
      };
    }

    const contextualPrompt = `You need to evaluate a workflow condition with the following details:

Condition: "${condition}"
Condition Type: ${conditionType}
User Query: "${query}"
Current Context: ${JSON.stringify(context.nodeResults)}
Execution Path: ${context.executionPath.join(" -> ")}

Please evaluate whether this condition is true or false based on the current context and user query. 
Explain your reasoning in a conversational way and then clearly state your decision.`;

    const llmResponse = await this.processMessage(contextualPrompt);

    // Extract boolean result from LLM response
    const responseText = llmResponse.content.toLowerCase();
    const result =
      responseText.includes("true") && !responseText.includes("false");

    return {
      nodeId: node.id,
      nodeType: "conditional",
      message: `🤔 **Condition Evaluation**\n\n${
        llmResponse.content
      }\n\n**Decision: ${result ? "TRUE" : "FALSE"}**`,
      timestamp: new Date(),
      conditionResult: result, // Store the result for edge evaluation
    };
  }

  /**
   * Process transform node for chat
   */
  private async processTransformNodeForChat(
    node: any,
    query: string,
    context: ExecutionContext
  ): Promise<WorkflowChatResponse> {
    const { transformScript } = node.data;

    const previousResults = context.nodeResults;
    const latestResult =
      context.executionPath.length > 0
        ? context.nodeResults[
            context.executionPath[context.executionPath.length - 1]
          ]
        : null;

    const contextualPrompt = `You are processing a data transformation node with the following:

Transform Script/Logic: ${transformScript || "Process and transform the data"}
Previous Results: ${JSON.stringify(previousResults)}
Latest Result: ${JSON.stringify(latestResult)}
User Query: "${query}"

Please transform or process the data according to the transformation logic. Explain what transformation you're applying and show the results.`;

    const llmResponse = await this.processMessage(contextualPrompt);

    return {
      nodeId: node.id,
      nodeType: "transform",
      message: `🔄 **Data Transformation**\n\n${llmResponse.content}`,
      timestamp: new Date(),
    };
  }

  /**
   * Process end node for chat
   */
  private async processEndNodeForChat(
    node: any,
    query: string,
    context: ExecutionContext
  ): Promise<WorkflowChatResponse> {
    const executionSummary = `
📊 **Workflow Execution Summary:**
- Nodes processed: ${context.executionPath.length}
- Execution path: ${context.executionPath.join(" → ")}
- Total duration: ${Date.now() - context.startTime.getTime()}ms

The workflow has completed successfully! All nodes have been processed for your query: "${query}"`;

    return {
      nodeId: node.id,
      nodeType: "end",
      message: `✅ **Workflow Complete**\n${executionSummary}`,
      timestamp: new Date(),
      isComplete: true,
    };
  }

  /**
   * Find the next node to execute based on current node and edges
   */
  private findNextNode(
    currentNode: any,
    workflow: WorkflowDefinition,
    currentResponse: WorkflowChatResponse
  ): string | null {
    const outgoingEdges = workflow.edges.filter(
      (edge) => edge.source === currentNode.id
    );

    if (outgoingEdges.length === 0) {
      return null;
    }

    // For conditional nodes, try to evaluate edge conditions
    if (currentNode.type === "conditional") {
      for (const edge of outgoingEdges) {
        if (edge.type === "conditional" && edge.data?.condition) {
          // Use the stored condition result if available
          if (typeof currentResponse.conditionResult === "boolean") {
            const conditionLower = edge.data.condition.toLowerCase();
            if (
              (conditionLower.includes("true") &&
                currentResponse.conditionResult) ||
              (conditionLower.includes("false") &&
                !currentResponse.conditionResult)
            ) {
              return edge.target;
            }
          } else {
            // Fallback to text-based evaluation
            const responseText = currentResponse.message.toLowerCase();
            const conditionLower = edge.data.condition.toLowerCase();

            if (
              conditionLower.includes("true") ||
              conditionLower.includes("success")
            ) {
              const shouldTakeEdge =
                responseText.includes("true") ||
                responseText.includes("success") ||
                responseText.includes("completed");
              if (shouldTakeEdge) {
                return edge.target;
              }
            } else if (
              conditionLower.includes("false") ||
              conditionLower.includes("error")
            ) {
              const shouldTakeEdge =
                responseText.includes("false") ||
                responseText.includes("error") ||
                responseText.includes("failed");
              if (shouldTakeEdge) {
                return edge.target;
              }
            }
          }
        }
      }
    }

    // For regular nodes, take the first available edge
    return outgoingEdges[0].target;
  }

  /**
   * Transform query for the next node based on current context
   */
  private async transformQueryForNode(
    originalQuery: string,
    nextNode: any,
    currentResponse: WorkflowChatResponse,
    context: ExecutionContext
  ): Promise<string> {
    // If this is the first node (start), just return the original query
    if (nextNode.type === "start" || context.executionPath.length === 0) {
      return originalQuery;
    }

    // Build context from previous results
    const previousResults = context.executionPath
      .map((nodeId) => {
        const result = context.nodeResults[nodeId];
        if (result && result.message) {
          return `Node ${nodeId}: ${result.message}`;
        }
        return null;
      })
      .filter(Boolean)
      .join("\n");

    // Use LLM to intelligently transform the query based on context and next node
    const transformPrompt = `You are transforming a user query for the next node in a workflow based on previous results.

Original User Query: "${originalQuery}"

Previous Node Results:
${previousResults}

Current Response: ${currentResponse.message}

Next Node Details:
- Type: ${nextNode.type}
- Label: ${nextNode.data?.label || "Unnamed"}
- Server: ${nextNode.data?.serverId || "N/A"}
- Tool: ${nextNode.data?.toolName || "N/A"}

Transform or enhance the original query to be more specific and contextual for the next node, incorporating insights and results from previous nodes. If no transformation is needed, return the original query.

Provide only the transformed query, no explanations.`;

    try {
      const transformedResponse = await this.processMessage(transformPrompt);
      const transformedQuery = transformedResponse.content.trim();

      // If the transformed query is reasonable, use it; otherwise, fall back to original
      if (
        transformedQuery &&
        transformedQuery.length > 0 &&
        transformedQuery.length < 1000
      ) {
        return transformedQuery;
      }
    } catch (error) {
      console.warn("Failed to transform query for next node:", error);
    }

    // Fallback to original query
    return originalQuery;
  }

  /**
   * Execute a workflow with proper graph traversal
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    initialData: any = {},
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    const executionId = `exec_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create execution context
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: "running",
      startTime: new Date(),
      nodeExecutions: workflow.nodes.map((node) => ({
        nodeId: node.id,
        status: "pending",
        retryCount: 0,
      })),
    };

    this.activeExecutions.set(executionId, execution);
    this.emitEvent("execution_started", executionId, workflow.id);

    try {
      // Build execution graph
      const executionGraph = this.buildExecutionGraph(workflow);

      // Find start nodes
      const startNodes = workflow.nodes.filter((node) => node.type === "start");
      if (startNodes.length === 0) {
        throw new Error("Workflow must have at least one start node");
      }
      if (startNodes.length > 1) {
        throw new Error("Workflow can only have one start node");
      }

      const context: ExecutionContext = {
        workflowId: workflow.id,
        executionId,
        currentNodeId: startNodes[0].id,
        nodeResults: { __initial: initialData },
        globalVariables: {},
        executionPath: [],
        startTime: new Date(),
        status: "running",
      };

      // Execute workflow starting from start node
      await this.executeNode(
        startNodes[0],
        workflow,
        execution,
        context,
        options
      );

      // Mark execution as completed if no errors
      if (!execution.nodeExecutions.some((ne) => ne.status === "error")) {
        execution.status = "completed";
        execution.endTime = new Date();
        this.emitEvent("execution_completed", executionId, workflow.id);
      }
    } catch (error) {
      execution.status = "error";
      execution.error =
        error instanceof Error ? error.message : "Unknown error";
      execution.endTime = new Date();
      this.emitEvent("execution_error", executionId, workflow.id, {
        error: execution.error,
      });
    }

    return execution;
  }

  /**
   * Execute a single node and continue to next nodes
   */
  private async executeNode(
    node: any,
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    context: ExecutionContext,
    options: WorkflowExecutionOptions
  ): Promise<any> {
    const nodeExecution = execution.nodeExecutions.find(
      (ne) => ne.nodeId === node.id
    );
    if (!nodeExecution) return;

    // Update node status to running
    nodeExecution.status = "running";
    nodeExecution.startTime = new Date();
    context.currentNodeId = node.id;
    context.executionPath.push(node.id);

    this.emitEvent("node_started", execution.id, workflow.id, {
      nodeId: node.id,
    });

    try {
      let result: any = null;

      // Execute based on node type
      switch (node.type) {
        case "start":
          result = context.nodeResults.__initial || {};
          break;

        case "end":
          result = { status: "workflow_completed" };
          break;

        case "server":
          result = await this.executeServerNode(node, context);
          break;

        case "tool":
          result = await this.executeToolNode(node, context);
          break;

        case "conditional":
          result = await this.executeConditionalNode(node, context);
          break;

        case "loop":
          result = await this.executeLoopNode(
            node,
            workflow,
            execution,
            context,
            options
          );
          break;

        case "parallel":
          result = await this.executeParallelNode(
            node,
            workflow,
            execution,
            context,
            options
          );
          break;

        case "aggregator":
          result = await this.executeAggregatorNode(node, context);
          break;

        case "transform":
          result = await this.executeTransformNode(node, context);
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Mark node as completed
      nodeExecution.status = "completed";
      nodeExecution.endTime = new Date();
      nodeExecution.output = result;
      nodeExecution.duration =
        nodeExecution.endTime.getTime() -
        (nodeExecution.startTime?.getTime() || 0);

      // Store result in context
      context.nodeResults[node.id] = result;

      this.emitEvent("node_completed", execution.id, workflow.id, {
        nodeId: node.id,
        result,
        duration: nodeExecution.duration,
      });

      // Continue to next nodes
      await this.continueToNextNodes(
        node,
        workflow,
        execution,
        context,
        options,
        result
      );

      return result;
    } catch (error) {
      nodeExecution.status = "error";
      nodeExecution.endTime = new Date();
      nodeExecution.error =
        error instanceof Error ? error.message : "Unknown error";
      nodeExecution.duration =
        nodeExecution.endTime.getTime() -
        (nodeExecution.startTime?.getTime() || 0);

      this.emitEvent("node_error", execution.id, workflow.id, {
        nodeId: node.id,
        error: nodeExecution.error,
      });

      if (!options.continueOnError && !node.data?.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Continue execution to the next connected nodes
   */
  private async continueToNextNodes(
    currentNode: any,
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    context: ExecutionContext,
    options: WorkflowExecutionOptions,
    currentResult: any
  ): Promise<void> {
    // Find outgoing edges from current node
    const outgoingEdges = workflow.edges.filter(
      (edge) => edge.source === currentNode.id
    );

    for (const edge of outgoingEdges) {
      let shouldFollow = true;

      // Check edge conditions
      if (edge.type === "conditional") {
        shouldFollow = this.evaluateEdgeCondition(edge, currentResult, context);
      }

      if (shouldFollow) {
        const nextNode = workflow.nodes.find((node) => node.id === edge.target);
        if (nextNode) {
          await this.executeNode(
            nextNode,
            workflow,
            execution,
            context,
            options
          );
        }
      }
    }
  }

  /**
   * Execute server node - use all tools or selected tools
   */
  private async executeServerNode(
    node: any,
    context: ExecutionContext
  ): Promise<any> {
    const { serverId, selectedTools } = node.data;

    if (!serverId) {
      throw new Error("Server node must have a server selected");
    }

    // Use the parent LangGraphAgent to process with real LLM and MCP tools
    const query =
      context.nodeResults.__initial?.userQuery || "Process this request";

    // Create a contextual prompt for the LLM
    const contextualPrompt = `You are processing a workflow node of type "server" with the following configuration:

Server ID: ${serverId}
Selected Tools: ${
      selectedTools ? selectedTools.join(", ") : "all available tools"
    }
User Query: "${query}"
Context: ${JSON.stringify(context.nodeResults)}

Please use the available MCP server tools to fulfill this request. Focus on using tools from the "${serverId}" server if available.`;

    // Call the parent LangGraphAgent's processMessage method
    const llmResponse = await this.processMessage(contextualPrompt);

    return {
      serverId,
      selectedTools: selectedTools || ["all"],
      llmResponse: llmResponse.content,
      toolCalls: llmResponse.toolCalls || [],
      timestamp: new Date(),
      success: true,
    };
  }

  /**
   * Execute tool node - run specific tool
   */
  private async executeToolNode(
    node: any,
    context: ExecutionContext
  ): Promise<any> {
    const { serverId, toolName, parameters } = node.data;

    if (!serverId || !toolName) {
      throw new Error("Tool node must have both server and tool selected");
    }

    // Use the parent LangGraphAgent to execute the specific tool
    const query =
      context.nodeResults.__initial?.userQuery || "Execute this tool";

    const contextualPrompt = `You need to execute a specific tool with the following configuration:

Server ID: ${serverId}
Tool Name: ${toolName}
Parameters: ${JSON.stringify(parameters || {})}
User Query: "${query}"
Context: ${JSON.stringify(context.nodeResults)}

Please execute the "${toolName}" tool from the "${serverId}" server with the provided parameters to fulfill the user's request.`;

    // Call the parent LangGraphAgent's processMessage method
    const llmResponse = await this.processMessage(contextualPrompt);

    return {
      toolName,
      serverId,
      parameters: parameters || {},
      llmResponse: llmResponse.content,
      toolCalls: llmResponse.toolCalls || [],
      result: llmResponse.content,
      timestamp: new Date(),
    };
  }

  /**
   * Execute conditional node - evaluate condition
   */
  private async executeConditionalNode(
    node: any,
    context: ExecutionContext
  ): Promise<any> {
    const { condition, conditionType } = node.data;

    if (!condition) {
      throw new Error("Conditional node must have a condition defined");
    }

    // Use the parent LangGraphAgent to evaluate the condition intelligently
    const query =
      context.nodeResults.__initial?.userQuery || "Evaluate this condition";

    const contextualPrompt = `You need to evaluate a workflow condition with the following details:

Condition: "${condition}"
Condition Type: ${conditionType}
User Query: "${query}"
Current Context: ${JSON.stringify(context.nodeResults)}
Execution Path: ${context.executionPath.join(" -> ")}

Please evaluate whether this condition is true or false based on the current context and user query. 
Respond with a clear "TRUE" or "FALSE" followed by your reasoning.`;

    // Call the parent LangGraphAgent's processMessage method
    const llmResponse = await this.processMessage(contextualPrompt);

    // Extract boolean result from LLM response
    const responseText = llmResponse.content.toLowerCase();
    const result =
      responseText.includes("true") && !responseText.includes("false");

    return {
      condition,
      conditionType,
      result,
      llmEvaluation: llmResponse.content,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Execute loop node - handle iteration
   */
  private async executeLoopNode(
    node: any,
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    context: ExecutionContext,
    options: WorkflowExecutionOptions
  ): Promise<any> {
    const { loopCondition, maxIterations = 10 } = node.data;
    const results: any[] = [];
    let iteration = 0;

    while (iteration < maxIterations) {
      // Check loop condition if provided
      if (
        loopCondition &&
        !this.evaluateJavaScriptCondition(loopCondition, context)
      ) {
        break;
      }

      // Execute loop body (nodes connected to this loop node)
      const loopResult = await this.executeLoopIteration(
        node,
        workflow,
        execution,
        context,
        options,
        iteration
      );
      results.push(loopResult);

      iteration++;
      context.iterationCount = iteration;
    }

    return { iterations: iteration, results };
  }

  /**
   * Execute parallel node - run branches concurrently
   */
  private async executeParallelNode(
    node: any,
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    context: ExecutionContext,
    options: WorkflowExecutionOptions
  ): Promise<any> {
    // Find all outgoing edges (parallel branches)
    const branches = workflow.edges.filter((edge) => edge.source === node.id);

    // Execute all branches in parallel
    const branchPromises = branches.map(async (edge) => {
      const branchNode = workflow.nodes.find((n) => n.id === edge.target);
      if (branchNode) {
        // Create separate context for this branch
        const branchContext = { ...context };
        return this.executeNode(
          branchNode,
          workflow,
          execution,
          branchContext,
          options
        );
      }
      return null;
    });

    const results = await Promise.all(branchPromises);
    return { branchResults: results, executedAt: new Date() };
  }

  /**
   * Execute aggregator node - combine results from multiple inputs
   */
  private async executeAggregatorNode(
    node: any,
    context: ExecutionContext
  ): Promise<any> {
    const { aggregationType = "merge", aggregationScript } = node.data;

    // Get results from previous nodes
    const previousResults = Object.values(context.nodeResults);

    let result: any;

    switch (aggregationType) {
      case "merge":
        result = Object.assign({}, ...previousResults);
        break;
      case "array":
        result = previousResults;
        break;
      case "first":
        result = previousResults[0];
        break;
      case "last":
        result = previousResults[previousResults.length - 1];
        break;
      case "custom":
        if (aggregationScript) {
          result = this.executeCustomAggregation(
            aggregationScript,
            previousResults,
            context
          );
        } else {
          result = previousResults;
        }
        break;
      default:
        result = previousResults;
    }

    return {
      aggregated: result,
      type: aggregationType,
      inputCount: previousResults.length,
    };
  }

  /**
   * Execute transform node - transform data
   */
  private async executeTransformNode(
    node: any,
    context: ExecutionContext
  ): Promise<any> {
    const { transformScript } = node.data;

    if (!transformScript) {
      throw new Error("Transform node must have a transformation script");
    }

    // Get the latest result
    const latestResult =
      context.nodeResults[
        context.executionPath[context.executionPath.length - 2]
      ];

    // Execute transformation
    const transformed = this.executeTransformation(
      transformScript,
      latestResult,
      context
    );

    return { original: latestResult, transformed, script: transformScript };
  }

  /**
   * Helper methods for evaluation and execution
   */
  private evaluateEdgeCondition(
    edge: any,
    result: any,
    context: ExecutionContext
  ): boolean {
    if (!edge.data?.condition) return true;

    try {
      // Simple condition evaluation
      if (edge.data.condition === "true" && result?.result === true)
        return true;
      if (edge.data.condition === "false" && result?.result === false)
        return true;

      return this.evaluateJavaScriptCondition(edge.data.condition, context);
    } catch {
      return false;
    }
  }

  private evaluateJavaScriptCondition(
    condition: string,
    context: ExecutionContext
  ): boolean {
    try {
      const func = new Function("context", "results", `return ${condition}`);
      return !!func(context, context.nodeResults);
    } catch {
      return false;
    }
  }

  private evaluateSimpleCondition(
    condition: string,
    context: ExecutionContext
  ): boolean {
    // Simple string-based conditions like "status === 'success'"
    try {
      return this.evaluateJavaScriptCondition(condition, context);
    } catch {
      return false;
    }
  }

  private evaluateJQCondition(
    condition: string,
    context: ExecutionContext
  ): boolean {
    // JQ-style condition evaluation (simplified)
    try {
      return this.evaluateJavaScriptCondition(condition, context);
    } catch {
      return false;
    }
  }

  private executeCustomAggregation(
    script: string,
    results: any[],
    context: ExecutionContext
  ): any {
    try {
      const func = new Function("results", "context", script);
      return func(results, context);
    } catch (error) {
      throw new Error(`Aggregation script error: ${error}`);
    }
  }

  private executeTransformation(
    script: string,
    input: any,
    context: ExecutionContext
  ): any {
    try {
      const func = new Function("input", "context", `return ${script}`);
      return func(input, context);
    } catch (error) {
      throw new Error(`Transformation script error: ${error}`);
    }
  }

  private async executeLoopIteration(
    loopNode: any,
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    context: ExecutionContext,
    options: WorkflowExecutionOptions,
    iteration: number
  ): Promise<any> {
    // This would execute the nodes within the loop
    // For now, just simulate
    await this.delay(500);
    return { iteration, timestamp: new Date() };
  }

  private buildExecutionGraph(
    workflow: WorkflowDefinition
  ): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    workflow.edges.forEach((edge) => {
      if (!graph.has(edge.source)) {
        graph.set(edge.source, []);
      }
      graph.get(edge.source)!.push(edge.target);
    });

    return graph;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private emitEvent(
    type: WorkflowEvent["type"],
    executionId: string,
    workflowId: string,
    data?: any
  ): void {
    const event: WorkflowEvent = {
      type,
      workflowId,
      executionId,
      nodeId: data?.nodeId,
      timestamp: new Date(),
      data,
    };

    // Emit to all listeners
    this.eventListeners.forEach((listener) => listener(event));
  }

  /**
   * Public methods for managing executions
   */
  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  public stopExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.status === "running") {
      execution.status = "paused";
      execution.endTime = new Date();
      return true;
    }
    return false;
  }

  public onEvent(
    listenerId: string,
    callback: (event: WorkflowEvent) => void
  ): void {
    this.eventListeners.set(listenerId, callback);
  }

  public removeEventListener(listenerId: string): void {
    this.eventListeners.delete(listenerId);
  }
}
