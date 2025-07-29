import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { tool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { MCPManager } from "../mcp/MCPManager";
import { ModelService } from "../services/ModelService";
import { ChatMessage, ToolCall, Tool, ModelConfig } from "../../shared/types";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export class LangGraphAgent {
  private mcpManager: MCPManager;
  private modelService: ModelService;
  private model: BaseChatModel | null = null;
  private modelWithTools: any = null; // Model bound with tools
  private app: any = null; // LangGraph compiled app
  private checkpointer: MemorySaver;
  private tools: any[] = [];
  private toolNode: ToolNode | null = null;
  private isInitialized: boolean = false;
  private currentThreadId: string | null = null;
  private currentModelConfig: ModelConfig | null = null;
  // Cache for recent tool executions to avoid duplicates
  private recentToolExecutions: Map<
    string,
    { result: string; timestamp: number }
  > = new Map();

  constructor(mcpManager: MCPManager, modelService: ModelService) {
    this.mcpManager = mcpManager;
    this.modelService = modelService;
    this.checkpointer = new MemorySaver(); // Initialize memory for conversations

    // Listen for tool state changes to refresh agent
    this.mcpManager.on("toolStateChanged", () => {
      console.log("LangGraphAgent: Tool state changed, refreshing agent...");
      this.refreshAgent();
    });

    // Initialize agent asynchronously
    this.initializeAgent();
  }

  private async initializeAgent() {
    try {
      // Get default model or try to create from environment variables
      await this.initializeDefaultModel();
      await this.setupAgent();
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize LangGraph Agent:", error);
    }
  }

  private async initializeDefaultModel() {
    // Try to get default model from ModelService
    const defaultModel = this.modelService.getDefaultModel();

    if (defaultModel && defaultModel.enabled) {
      try {
        this.model = this.modelService.createModelInstance(defaultModel);
        this.currentModelConfig = defaultModel;
        console.log(`Initialized with configured model: ${defaultModel.name}`);
        return;
      } catch (error) {
        console.warn(
          `Failed to initialize configured model ${defaultModel.name}:`,
          error
        );
      }
    }

    // Fallback: try to create Watsonx model from environment variables
    const apiKey = process.env.WATSONX_API_KEY;
    const projectId = process.env.WATSONX_PROJECT_ID;

    if (
      apiKey &&
      projectId &&
      !apiKey.includes("your_") &&
      !projectId.includes("your_")
    ) {
      try {
        const { ChatWatsonx } = await import(
          "@langchain/community/chat_models/ibm"
        );

        this.model = new ChatWatsonx({
          model: process.env.WATSONX_MODEL_ID || "ibm/granite-3-3-8b-instruct",
          version: "2023-05-29",
          serviceUrl:
            process.env.WATSONX_URL || "https://us-south.ml.cloud.ibm.com",
          projectId: projectId,
          watsonxAIAuthType: "iam",
          watsonxAIApikey: apiKey,
          maxTokens: 8000,
          temperature: 0.1,
          topP: 0.9,
          streaming: false,
        });

        console.log("Initialized with environment Watsonx model");
        return;
      } catch (error) {
        console.warn(
          "Failed to initialize Watsonx model from environment:",
          error
        );
      }
    }

    console.warn(
      "No model configuration found. Please configure a model in settings."
    );
  }

  private async setupAgent(model?: BaseChatModel) {
    // Use provided model or current model
    const agentModel = model || this.model;

    if (!agentModel) {
      console.warn("No model available for agent setup");
      return;
    }

    // Get available tools as LangChain tools
    this.tools = await this.getAvailableTools();

    // Handle the case when no tools are available
    if (this.tools.length === 0) {
      this.toolNode = null;

      // Create a simple workflow without tools
      const workflow = new StateGraph(MessagesAnnotation)
        .addNode("agent", this.callModel.bind(this))
        .addEdge("__start__", "agent")
        .addEdge("agent", "__end__");

      this.app = workflow.compile({ checkpointer: this.checkpointer });
    } else {
      // Create tool node with all available tools
      this.toolNode = new ToolNode(this.tools);

      // Bind tools to model for native tool calling
      if (
        "bindTools" in agentModel &&
        typeof agentModel.bindTools === "function"
      ) {
        this.modelWithTools = agentModel.bindTools(this.tools, {
          tool_choice: "auto",
        });
      } else {
        console.warn("Model does not support tool binding");
        this.modelWithTools = agentModel;
      }

      // Create the StateGraph workflow
      const workflow = new StateGraph(MessagesAnnotation)
        .addNode("agent", this.callModel.bind(this))
        .addNode("tools", this.toolNode)
        .addNode("respond", this.respondWithToolResults.bind(this))
        .addEdge("__start__", "agent")
        .addEdge("tools", "respond")
        .addEdge("respond", "__end__")
        .addConditionalEdges("agent", this.shouldContinue.bind(this));

      // Compile the workflow with checkpointer for memory
      this.app = workflow.compile({ checkpointer: this.checkpointer });
    }

    console.log(`LangGraphAgent: StateGraph workflow set up successfully`);
  }

  // StateGraph node function - calls the model
  private async callModel(state: typeof MessagesAnnotation.State) {
    try {
      console.log("Calling model with messages:", state.messages.length);

      // Use the model with tools if available, otherwise use the base model
      const modelToUse = this.modelWithTools || this.model;

      if (!modelToUse) {
        throw new Error("No model available");
      }

      const messages = state.messages;
      let messagesToSend = messages;

      // For tool-enabled models, add a strong system instruction for each query
      if (this.modelWithTools && messages.length > 0) {
        // Find the last human message (current user query)
        const lastHumanMessage = messages
          .slice()
          .reverse()
          .find((msg) => msg.getType() === "human");

        if (lastHumanMessage) {
          const currentQuery =
            typeof lastHumanMessage.content === "string"
              ? lastHumanMessage.content
              : JSON.stringify(lastHumanMessage.content);

          // Get available tool names for context
          const availableTools = this.tools.map((tool) => tool.name).join(", ");

          // Create a focused system instruction that emphasizes tool usage
          const systemInstruction = new HumanMessage({
            content: `You are a helpful AI assistant with these tools: ${availableTools}

CRITICAL: You MUST use tools to answer this specific query: "${currentQuery}"

Do not provide answers based on general knowledge when tools can give specific, current information. Always use the appropriate tools first, then respond based on their results.`,
          });

          // Send only the system instruction and the current user query
          // This avoids confusion from conversation history
          messagesToSend = [systemInstruction, lastHumanMessage];
        }
      }

      const response = await modelToUse.invoke(messagesToSend);
      console.log("Model response:", response);

      // Return the response in the format expected by StateGraph
      return { messages: [response] };
    } catch (error) {
      console.error("Error in callModel:", error);
      const errorMessage = new AIMessage({
        content: `Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      return { messages: [errorMessage] };
    }
  }

  // StateGraph conditional edge function - determines next step
  private shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

    console.log("Checking if should continue, last message:", {
      hasToolCalls: !!lastMessage.tool_calls?.length,
      toolCallsCount: lastMessage.tool_calls?.length || 0,
    });

    // If the LLM makes a tool call, route to the "tools" node
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }

    // No tools needed, end the workflow
    return "__end__";
  }

  // New node function - generates response after seeing tool results
  private async respondWithToolResults(state: typeof MessagesAnnotation.State) {
    try {
      console.log("Generating response with tool results...");

      if (!this.model) {
        throw new Error("No model available");
      }

      // Find the user query and tool results
      const messages = state.messages;

      // Find the last human message (user query)
      const lastHumanMessage = messages
        .slice()
        .reverse()
        .find((msg) => msg.getType() === "human");

      if (!lastHumanMessage) {
        throw new Error("No user query found");
      }

      const currentQuery =
        typeof lastHumanMessage.content === "string"
          ? lastHumanMessage.content
          : JSON.stringify(lastHumanMessage.content);

      // Create a system instruction that asks the LLM to respond based on tool results
      const systemInstruction = new HumanMessage({
        content: `You are a helpful AI assistant. The user asked: "${currentQuery}"

You have executed tools to gather information for this query. Based on the tool results in the conversation, provide a clear, conversational response that directly answers the user's question.

Be natural and helpful. Explain what information you found and how it answers their question.`,
      });

      // Send the system instruction plus the relevant conversation history (including tool results)
      const messagesToSend = [systemInstruction, ...messages.slice(-10)]; // Include recent context

      const response = await this.model.invoke(messagesToSend);
      console.log("Generated response with tool results:", response);

      return { messages: [response] };
    } catch (error) {
      console.error("Error in respondWithToolResults:", error);
      const errorMessage = new AIMessage({
        content: `I encountered an error while generating my response: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      return { messages: [errorMessage] };
    }
  }

  // Helper function to extract key information from tool results
  private extractToolResults(toolExecutions: any[]): string {
    if (toolExecutions.length === 0) {
      return "I used my built-in knowledge to provide this response.";
    }

    return toolExecutions
      .map((exec) => {
        return `From ${exec.name}: ${exec.result}`;
      })
      .join("\n\n");
  }

  private async getAvailableTools(): Promise<any[]> {
    console.log("LangGraphAgent: Getting available tools...");
    const tools: any[] = [];
    const servers = this.mcpManager.listServers();
    // console.log("LangGraphAgent: Found servers:", servers);

    // Get tools from all connected servers
    const connectedServers = servers.filter((s) => s.connected);
    // console.log("LangGraphAgent: Connected servers:", connectedServers);

    if (connectedServers.length === 0) {
      console.log(
        "LangGraphAgent: No connected servers, returning empty tools array"
      );
      return tools;
    }

    // Get tools from all connected servers
    try {
      const mcpTools = await this.mcpManager.listToolsForAgent();
      // console.log("LangGraphAgent: Retrieved MCP tools:", mcpTools);

      // // Debug: Show server mapping for each tool
      // mcpTools.forEach((tool) => {
      //   console.log(
      //     `Tool '${tool.name}' belongs to server '${
      //       tool.serverId
      //     }' (type: ${typeof tool.serverId})`
      //   );
      // });

      for (const mcpTool of mcpTools) {
        try {
          // Convert JSON Schema to Zod schema for better type safety
          const zodSchema = this.convertJsonSchemaToZod(
            mcpTool.inputSchema,
            mcpTool.name
          );

          // Use the modern tool() function for better reliability
          const langchainTool = tool(
            async (input: any) => {
              try {
                console.log(`Tool ${mcpTool.name} called with input:`, input);

                // The modern tool() function handles input parsing better
                let args = input || {};

                // Create a cache key for this tool execution
                const cacheKey = `${mcpTool.name}:${JSON.stringify(args)}`;
                const now = Date.now();
                const cacheExpiryMs = 30000; // 30 seconds cache

                // Check if we have a recent execution with same args
                const cachedExecution = this.recentToolExecutions.get(cacheKey);
                if (
                  cachedExecution &&
                  now - cachedExecution.timestamp < cacheExpiryMs
                ) {
                  console.log(
                    `Using cached result for ${mcpTool.name} with args:`,
                    args
                  );
                  return cachedExecution.result;
                }

                console.log(`Executing tool ${mcpTool.name} with args:`, args);
                console.log(`Tool ${mcpTool.name} serverId:`, mcpTool.serverId);

                // Ensure serverId is a string
                const serverId =
                  typeof mcpTool.serverId === "string"
                    ? mcpTool.serverId
                    : String(mcpTool.serverId || "");

                if (!serverId) {
                  throw new Error(`No serverId found for tool ${mcpTool.name}`);
                }

                // Check if this server has a preferred model and switch to it
                const serverConfig = this.mcpManager.getServerConfig(serverId);
                let modelSwitched = false;
                let previousModel = null;
                let actualModelUsed = this.currentModelConfig?.modelId;

                if (
                  serverConfig?.preferredModelId &&
                  serverConfig.preferredModelId !== this.currentModelConfig?.id
                ) {
                  try {
                    console.log(
                      `Switching to preferred model for server ${serverId}: ${serverConfig.preferredModelId}`
                    );
                    previousModel = this.currentModelConfig;
                    await this.switchToModel(serverConfig.preferredModelId);
                    modelSwitched = true;
                    actualModelUsed = this.currentModelConfig?.modelId;
                  } catch (error) {
                    console.warn(
                      `Failed to switch to preferred model ${serverConfig.preferredModelId} for server ${serverId}, using current model:`,
                      error
                    );
                  }
                }

                // Call the MCP tool with the correct parameter order
                const result = await this.mcpManager.callTool(
                  mcpTool.name,
                  args,
                  serverId
                );

                // Switch back to previous model if we switched
                if (modelSwitched && previousModel) {
                  try {
                    console.log(
                      `Switching back to previous model: ${previousModel.id}`
                    );
                    await this.switchToModel(previousModel.id);
                  } catch (error) {
                    console.warn(
                      `Failed to switch back to previous model ${previousModel.id}:`,
                      error
                    );
                  }
                }

                console.log(`Tool ${mcpTool.name} result:`, result);

                // Tools must always return strings according to LangChain docs
                const stringResult =
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2);

                // Store model information for this tool execution
                // We'll append it to the result so we can extract it later
                const resultWithModelInfo = `${stringResult}|||MODEL_USED:${
                  actualModelUsed || "unknown"
                }|||`;

                // Cache the result (without model info)
                this.recentToolExecutions.set(cacheKey, {
                  result: stringResult,
                  timestamp: now,
                });

                // Clean up old cache entries (keep only last 50 entries)
                if (this.recentToolExecutions.size > 50) {
                  const entries = Array.from(
                    this.recentToolExecutions.entries()
                  );
                  entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                  this.recentToolExecutions.clear();
                  entries.slice(0, 25).forEach(([key, value]) => {
                    this.recentToolExecutions.set(key, value);
                  });
                }

                return resultWithModelInfo;
              } catch (error: any) {
                console.error(`Error executing tool ${mcpTool.name}:`, error);
                return `Error executing ${mcpTool.name}: ${error.message}`;
              }
            },
            {
              name: mcpTool.name,
              description: this.enhanceToolDescription(mcpTool),
              schema: zodSchema,
            }
          );

          tools.push(langchainTool);
          // console.log(`Created tool for ${mcpTool.name}`);
        } catch (toolError: any) {
          console.error(`Error creating tool ${mcpTool.name}:`, toolError);
          // Skip tools that can't be created properly
        }
      }
    } catch (error) {
      console.error("LangGraphAgent: Error getting tools:", error);
    }

    console.log(
      `LangGraphAgent: Loaded ${tools.length} tools from ${connectedServers.length} connected servers`
    );
    return tools;
  }

  public isReady(): boolean {
    return this.isInitialized && !!this.app && !!this.model;
  }

  async processMessage(
    message: string,
    modelId?: string
  ): Promise<ChatMessage> {
    try {
      // Ensure agent is initialized
      if (!this.isInitialized) {
        await this.initializeAgent();
      }

      // Switch model if requested
      if (modelId) {
        await this.switchToModel(modelId);
      }

      // Refresh tools in case new servers were connected
      await this.setupAgent();

      // If no model is available, return an error
      if (!this.model) {
        return {
          id: uuidv4(),
          role: "assistant",
          content:
            "No model is configured. Please configure a model in settings.",
          timestamp: new Date(),
        };
      }

      console.log("Processing message with StateGraph workflow:", message);

      // Create a unique thread ID for this conversation if one doesn't exist
      if (!this.currentThreadId) {
        this.currentThreadId = uuidv4();
        console.log(
          `LangGraphAgent: Starting new conversation with thread ID: ${this.currentThreadId}`
        );
      }
      const config = { configurable: { thread_id: this.currentThreadId } };

      // Handle case when no tools are available (app is LLM-only)
      if (!this.toolNode || this.tools.length === 0) {
        console.log(
          "LangGraphAgent: No tools available, using LLM-only workflow"
        );

        // Invoke the LLM-only workflow
        const result = await this.app.invoke(
          {
            messages: [
              new HumanMessage({
                content: `You are Granite, developed by IBM. You are a helpful AI assistant.

Since no MCP tools are currently available, respond using your built-in knowledge. If users ask about specific operations that would require tools (like checking current time, listing files, or git operations), politely explain that those tools are not currently connected and offer to help with other questions.

Be conversational and helpful. You can discuss general knowledge, programming concepts, and provide guidance on various topics.

User query: ${message}`,
              }),
            ],
          },
          config
        );

        const lastMessage = result.messages[result.messages.length - 1];
        return {
          id: uuidv4(),
          role: "assistant",
          content: lastMessage.content || "No response generated",
          timestamp: new Date(),
          toolCalls: [],
        };
      }

      // Use StateGraph workflow with tools
      console.log("Processing message with StateGraph ReAct workflow");

      // Invoke the StateGraph workflow - it will handle tool calling automatically
      const result = await this.app.invoke(
        {
          messages: [new HumanMessage({ content: message })],
        },
        config
      );

      console.log("StateGraph result:", result);

      // Extract the final response and tool calls from the workflow result
      let content = "No response generated";
      const toolCalls: ToolCall[] = [];

      if (result.messages && result.messages.length > 0) {
        // Get the last message from the workflow
        const lastMessage = result.messages[result.messages.length - 1];
        content = lastMessage.content || "No response generated";

        // Find the starting point of this conversation turn by looking for our input message
        const inputMessageIndex = result.messages.findIndex(
          (msg: BaseMessage) =>
            msg.getType() === "human" && msg.content === message
        );

        // Only extract tool calls from messages after our input (current turn only)
        const currentTurnMessages =
          inputMessageIndex >= 0
            ? result.messages.slice(inputMessageIndex)
            : result.messages;

        // Extract tool calls only from AI messages in the current turn
        const currentTurnAiMessages = currentTurnMessages.filter(
          (msg: BaseMessage) => msg.getType() === "ai"
        ) as AIMessage[];

        for (const aiMessage of currentTurnAiMessages) {
          if (aiMessage.tool_calls && Array.isArray(aiMessage.tool_calls)) {
            for (const toolCall of aiMessage.tool_calls) {
              // Find the corresponding tool message with the result (also from current turn)
              const toolMessage = currentTurnMessages.find(
                (msg: BaseMessage) =>
                  msg.getType() === "tool" &&
                  (msg as any).tool_call_id === toolCall.id
              );

              // Extract model information from tool result if available
              let toolResult = toolMessage
                ? (toolMessage as any).content
                : undefined;
              let modelUsedForTool =
                this.currentModelConfig?.modelId || modelId;

              if (
                toolResult &&
                typeof toolResult === "string" &&
                toolResult.includes("|||MODEL_USED:")
              ) {
                const parts = toolResult.split("|||MODEL_USED:");
                if (parts.length === 2) {
                  toolResult = parts[0]; // Clean result without model info
                  const modelPart = parts[1].split("|||")[0]; // Extract model info
                  if (modelPart && modelPart !== "unknown") {
                    modelUsedForTool = modelPart;
                  }
                }
              }

              toolCalls.push({
                id: toolCall.id || uuidv4(),
                name: toolCall.name,
                args: toolCall.args,
                serverId: "mcp", // StateGraph handles this automatically
                result: toolResult,
                modelId: modelUsedForTool, // Use the actual model that executed this tool
              });
            }
          }
        }
      }

      return {
        id: uuidv4(),
        role: "assistant",
        content,
        timestamp: new Date(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error: any) {
      console.error("Error processing message with StateGraph:", error);
      return {
        id: uuidv4(),
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  // Method to switch to a specific model configuration
  async switchToModel(modelConfigId: string): Promise<void> {
    const configs = this.modelService.getModelConfigs();
    const targetConfig = configs.find((c) => c.id === modelConfigId);

    if (!targetConfig || !targetConfig.enabled) {
      throw new Error(
        `Model configuration '${modelConfigId}' not found or disabled`
      );
    }

    try {
      this.model = this.modelService.createModelInstance(targetConfig);
      this.currentModelConfig = targetConfig;
      console.log(`Switched to model: ${targetConfig.name}`);
    } catch (error) {
      console.error(`Failed to switch to model ${targetConfig.name}:`, error);
      throw error;
    }
  }

  // Method to get current model configuration
  getCurrentModelConfig(): ModelConfig | null {
    return this.currentModelConfig;
  }

  // Method to refresh the agent when tools change
  public async refreshAgent(): Promise<void> {
    console.log(
      "LangGraphAgent: Refreshing StateGraph workflow with updated tools..."
    );
    await this.setupAgent();
    console.log("LangGraphAgent: StateGraph workflow refreshed successfully");
  }

  // Method to start a new conversation (and clear history)
  public startNewConversation(): void {
    this.currentThreadId = null;
    // Clear tool execution cache for new conversation
    this.recentToolExecutions.clear();
    console.log(
      "LangGraphAgent: Started new conversation and cleared tool cache"
    );
  }

  // Method to set a custom thread ID for conversation context
  public setThreadId(threadId: string): void {
    this.currentThreadId = threadId;
    console.log(`LangGraphAgent: Set thread ID to: ${threadId}`);
  }

  // Method to get current thread ID
  public getThreadId(): string | null {
    return this.currentThreadId;
  }

  // Method to clear tool execution cache
  public clearToolCache(): void {
    this.recentToolExecutions.clear();
    console.log("LangGraphAgent: Tool execution cache cleared");
  }

  // Convert JSON Schema to Zod schema for better type safety
  private convertJsonSchemaToZod(
    jsonSchema: any,
    toolName?: string
  ): z.ZodSchema {
    if (!jsonSchema || !jsonSchema.properties) {
      return z.object({});
    }

    const zodProperties: Record<string, z.ZodSchema> = {};
    const required = jsonSchema.required || [];

    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      const prop = value as any;
      let zodSchema: z.ZodSchema;

      // Convert based on JSON Schema type
      switch (prop.type) {
        case "string":
          zodSchema = z.string();
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
          break;
        case "number":
        case "integer":
          zodSchema = z.number();
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
          break;
        case "boolean":
          zodSchema = z.boolean();
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
          break;
        case "array":
          zodSchema = z.array(z.any());
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
          break;
        case "object":
          zodSchema = z.object({});
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
          break;
        default:
          zodSchema = z.any();
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
      }

      // Make optional if not required
      if (!required.includes(key)) {
        zodSchema = zodSchema.optional();
      }

      zodProperties[key] = zodSchema;
    }

    return z.object(zodProperties);
  }

  private enhanceToolDescription(tool: Tool): string {
    const name = tool.name || "Unknown Tool";
    const description = tool.description || "No description available";
    const schema = tool.inputSchema || {};

    let enhanced = `${name}: ${description}`;

    if (schema.properties) {
      const params = Object.keys(schema.properties);
      if (params.length > 0) {
        enhanced += `\nParameters: ${params.join(", ")}`;
      }
    }

    return enhanced;
  }
}
