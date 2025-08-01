import { MemorySaver } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
} from "@langchain/langgraph";
import { MCPManager } from "../mcp/MCPManager";
import { ModelService } from "../services/ModelService";
import { ChatMessage, ToolCall, Tool, ModelConfig } from "../../shared/types";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true";
process.env.LANGCHAIN_TRACING_V2 = "true";
process.env.LANGCHAIN_PROJECT = "mcp-studio";
process.env.LANGCHAIN_API_KEY =
  "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";

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
        .addEdge(START, "agent")
        .addEdge("agent", END);

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
        .addEdge(START, "agent")
        .addEdge("tools", "agent")
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

      const modelToUse = this.modelWithTools || this.model;
      if (!modelToUse) {
        throw new Error("No model available");
      }

      let messagesToSend = [...state.messages];

      // Only add system instruction on the first call
      if (
        this.modelWithTools &&
        state.messages.filter((m) => m.getType() === "human").length === 1
      ) {
        const lastHumanMessage = state.messages.find(
          (msg) => msg.getType() === "human"
        );

        if (lastHumanMessage) {
          const currentQuery =
            typeof lastHumanMessage.content === "string"
              ? lastHumanMessage.content
              : JSON.stringify(lastHumanMessage.content);

          const availableTools = this.tools.map((tool) => tool.name).join(", ");

          const systemInstruction = new HumanMessage({
            content: `You are a helpful AI assistant with these tools: ${availableTools}

CRITICAL: You MUST use tools to answer this specific query: "${currentQuery}"

Do not provide answers based on general knowledge when tools can give specific, current information. Always use the appropriate tools first, then respond based on their results.`,
          });

          messagesToSend = [systemInstruction, ...state.messages];
        }
      }

      const response = await modelToUse.invoke(messagesToSend);
      console.log("Model response:", response);

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

    // If the last message is from the assistant and has no tool calls, we're done
    if (lastMessage.getType() === "ai" && !lastMessage.tool_calls?.length) {
      return END;
    }

    // If the LLM makes a tool call, route to the "tools" node
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }

    // Default to ending the workflow
    return END;
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
              let args = input || {};

              try {
                console.log(`Tool ${mcpTool.name} called with input:`, input);

                // Apply comprehensive input processing (normalization + validation + transformations)
                args = await this.processToolInputs(args, mcpTool);

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

                console.log(
                  `Executing tool ${mcpTool.name} with processed args:`,
                  args
                );
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

                // Call the MCP tool with the processed arguments
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

                // Provide comprehensive error information
                if (
                  error.message &&
                  error.message.includes("Schema validation failed")
                ) {
                  console.error(
                    `Comprehensive error details for ${mcpTool.name}:`
                  );
                  console.error("Original input:", input);
                  console.error("Processed args:", args);
                  console.error(
                    "Expected schema:",
                    JSON.stringify(mcpTool.inputSchema, null, 2)
                  );

                  return `Error executing ${mcpTool.name}: ${error.message}

Input validation failed. Here's what happened:
- Original input: ${JSON.stringify(input, null, 2)}
- After processing: ${JSON.stringify(args, null, 2)}
- Expected schema: ${JSON.stringify(mcpTool.inputSchema, null, 2)}

This suggests there may be a mismatch between the tool's expected parameters and what was provided. Please check the tool documentation or schema definition.`;
                }

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

  // Option 2: Use LangChain's withStructuredOutput for guaranteed valid tool calls
  private async createStructuredToolCallingModel(tools: any[]): Promise<any> {
    if (!this.model || tools.length === 0) {
      return this.model;
    }

    try {
      // Check if the model supports structured output
      if (
        "withStructuredOutput" in this.model &&
        typeof this.model.withStructuredOutput === "function"
      ) {
        console.log("Using structured output for tool calling validation");

        // Create a union schema for all tools
        if (tools.length === 1) {
          const schema = this.convertJsonSchemaToZodForStructuredOutput(
            tools[0].schema
          );
          const toolSchema = z.object({
            tool: z.literal(tools[0].name),
            arguments: schema,
          });

          // Return model with structured output
          return this.model.withStructuredOutput(toolSchema, {
            name: "tool_call",
          });
        } else if (tools.length > 1) {
          const toolSchemas = tools.map((tool) => {
            const schema = this.convertJsonSchemaToZodForStructuredOutput(
              tool.schema
            );
            return z.object({
              tool: z.literal(tool.name),
              arguments: schema,
            });
          });

          // Create union schema with proper typing
          const [first, second, ...rest] = toolSchemas;
          const toolUnionSchema = z.union([first, second, ...rest]);

          // Return model with structured output
          return this.model.withStructuredOutput(toolUnionSchema, {
            name: "tool_call",
          });
        }
      }
    } catch (error) {
      console.warn(
        "Failed to create structured output model, falling back to regular tool binding:",
        error
      );
    }

    return this.model;
  }

  // Convert JSON Schema to Zod specifically for structured output (more strict)
  private convertJsonSchemaToZodForStructuredOutput(
    jsonSchema: any
  ): z.ZodSchema {
    if (!jsonSchema || typeof jsonSchema.parse !== "function") {
      // If it's already a Zod schema, return as-is
      if (
        jsonSchema &&
        typeof jsonSchema === "object" &&
        "parse" in jsonSchema
      ) {
        return jsonSchema;
      }
      return z.object({});
    }

    // For structured output, we want strict validation without coercion
    return jsonSchema;
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
          zodSchema = z.coerce.string(); // Use coerce for automatic type conversion
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
          break;
        case "number":
          zodSchema = z.coerce.number(); // Use coerce for automatic type conversion
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
          break;
        case "integer":
          zodSchema = z.coerce.number().int(); // Use coerce for automatic type conversion
          if (prop.description) {
            zodSchema = zodSchema.describe(prop.description);
          }
          break;
        case "boolean":
          zodSchema = z.coerce.boolean(); // Use coerce for automatic type conversion
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

  // Enhanced tool description for better parameter understanding across all tools
  private enhanceToolDescription(tool: Tool): string {
    const name = tool.name || "Unknown Tool";
    const description = tool.description || "No description available";
    const schema = tool.inputSchema || {};

    let enhanced = `${name}: ${description}`;

    if (schema.properties) {
      const params = Object.keys(schema.properties);
      if (params.length > 0) {
        enhanced += `\nParameters: ${params.join(", ")}`;

        // Add detailed parameter descriptions with exact names, types, and examples
        enhanced += `\n\nParameter Details:`;
        for (const [paramName, paramDef] of Object.entries(schema.properties)) {
          const param = paramDef as any;
          const required = schema.required?.includes(paramName)
            ? "(required)"
            : "(optional)";
          enhanced += `\n- ${paramName} ${required}: ${param.type}`;
          if (param.description) {
            enhanced += ` - ${param.description}`;
          }

          // Add format information if available
          if (param.format) {
            enhanced += ` [format: ${param.format}]`;
          }

          // Add enum values if available
          if (param.enum && Array.isArray(param.enum)) {
            enhanced += ` [options: ${param.enum.join(", ")}]`;
          }

          // Add min/max constraints if available
          if (param.minimum !== undefined || param.maximum !== undefined) {
            const constraints = [];
            if (param.minimum !== undefined)
              constraints.push(`min: ${param.minimum}`);
            if (param.maximum !== undefined)
              constraints.push(`max: ${param.maximum}`);
            enhanced += ` [${constraints.join(", ")}]`;
          }

          // Add array item type if available
          if (param.type === "array" && param.items) {
            enhanced += ` [items: ${param.items.type || "any"}]`;
          }
        }

        // Add critical instruction about parameter naming
        enhanced += `\n\nCRITICAL: Use exact parameter names as shown above. Use camelCase format, not snake_case or other variations.`;

        // Add tool-specific examples for better understanding
        enhanced += this.getToolSpecificExample(name, schema);
      }
    }

    return enhanced;
  }

  // Get tool-specific usage examples
  private getToolSpecificExample(toolName: string, schema: any): string {
    const lowerName = toolName.toLowerCase();

    // Sequential thinking tool
    if (lowerName.includes("sequential") || lowerName.includes("thinking")) {
      return `\n\nExample usage:
{
  "thought": "Your thinking step here",
  "nextThoughtNeeded": true,
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "isRevision": false,
  "revisesThought": 0,
  "branchFromThought": 0,
  "branchId": "",
  "needsMoreThoughts": false
}`;
    }

    // File operations
    if (
      lowerName.includes("file") ||
      lowerName.includes("read") ||
      lowerName.includes("write")
    ) {
      return `\n\nExample usage:
{
  "path": "/path/to/file.txt",
  "content": "file content here",
  "encoding": "utf8"
}`;
    }

    // Git operations
    if (lowerName.includes("git")) {
      return `\n\nExample usage:
{
  "repository": "/path/to/repo",
  "branch": "main",
  "message": "commit message"
}`;
    }

    // Weather tools
    if (lowerName.includes("weather")) {
      return `\n\nExample usage:
{
  "location": "New York, NY",
  "units": "metric",
  "includeHourly": true
}`;
    }

    // Time tools
    if (lowerName.includes("time") || lowerName.includes("date")) {
      return `\n\nExample usage:
{
  "timezone": "America/New_York",
  "format": "YYYY-MM-DD HH:mm:ss"
}`;
    }

    // Database operations
    if (
      lowerName.includes("database") ||
      lowerName.includes("sql") ||
      lowerName.includes("query")
    ) {
      return `\n\nExample usage:
{
  "query": "SELECT * FROM table WHERE condition = ?",
  "parameters": ["value1"],
  "database": "mydb"
}`;
    }

    // API calls
    if (
      lowerName.includes("api") ||
      lowerName.includes("http") ||
      lowerName.includes("request")
    ) {
      return `\n\nExample usage:
{
  "url": "https://api.example.com/endpoint",
  "method": "GET",
  "headers": {"Content-Type": "application/json"},
  "body": {"key": "value"}
}`;
    }

    // Search operations
    if (lowerName.includes("search") || lowerName.includes("find")) {
      return `\n\nExample usage:
{
  "query": "search term",
  "limit": 10,
  "sortBy": "relevance"
}`;
    }

    // If no specific example, generate a generic one based on schema
    if (schema.properties) {
      const exampleObj: any = {};
      for (const [paramName, paramDef] of Object.entries(schema.properties)) {
        const param = paramDef as any;
        exampleObj[paramName] = this.getExampleValueForType(param);
      }

      return `\n\nExample usage:
${JSON.stringify(exampleObj, null, 2)}`;
    }

    return "";
  }

  // Generate example values based on parameter type and description
  private getExampleValueForType(param: any): any {
    const type = param.type;
    const description = (param.description || "").toLowerCase();

    switch (type) {
      case "string":
        if (description.includes("email")) return "user@example.com";
        if (description.includes("url") || description.includes("link"))
          return "https://example.com";
        if (description.includes("path") || description.includes("file"))
          return "/path/to/file";
        if (description.includes("name")) return "example_name";
        if (description.includes("id")) return "unique_id_123";
        if (description.includes("message") || description.includes("text"))
          return "example text";
        if (param.enum && Array.isArray(param.enum)) return param.enum[0];
        return "example_value";

      case "number":
      case "integer":
        if (description.includes("count") || description.includes("number"))
          return 1;
        if (description.includes("limit") || description.includes("max"))
          return 10;
        if (description.includes("port")) return 8080;
        if (description.includes("timeout")) return 30;
        if (param.minimum !== undefined) return param.minimum;
        return 42;

      case "boolean":
        if (description.includes("enable") || description.includes("allow"))
          return true;
        if (description.includes("disable") || description.includes("skip"))
          return false;
        return true;

      case "array":
        if (param.items) {
          const itemExample = this.getExampleValueForType(param.items);
          return [itemExample];
        }
        return ["example_item"];

      case "object":
        return { key: "value" };

      default:
        return "example_value";
    }
  }

  // Comprehensive tool input normalization and validation system
  private async processToolInputs(args: any, mcpTool: any): Promise<any> {
    if (!mcpTool.inputSchema || !mcpTool.inputSchema.properties) {
      return args;
    }

    console.log(`Processing tool inputs for ${mcpTool.name}:`, args);

    try {
      // Step 1: Normalize parameter names (handle different naming conventions)
      const normalizedArgs = this.normalizeAllParameterNames(
        args,
        mcpTool.inputSchema
      );
      console.log(`After normalization:`, normalizedArgs);

      // Step 2: Validate and coerce types using Zod
      const zodSchema = this.convertJsonSchemaToZod(
        mcpTool.inputSchema,
        mcpTool.name
      );
      const validatedArgs = this.validateAndCoerceToolInputs(
        normalizedArgs,
        zodSchema
      );
      console.log(`After validation:`, validatedArgs);

      // Step 3: Apply tool-specific transformations if needed
      const finalArgs = this.applyToolSpecificTransformations(
        validatedArgs,
        mcpTool.name
      );
      console.log(`Final processed args for ${mcpTool.name}:`, finalArgs);

      return finalArgs;
    } catch (error) {
      console.error(
        `Failed to process tool inputs for ${mcpTool.name}:`,
        error
      );
      console.error(`Original args:`, args);
      console.error(
        `Expected schema:`,
        JSON.stringify(mcpTool.inputSchema, null, 2)
      );

      // Try fallback normalization
      try {
        const fallbackArgs = this.fallbackParameterNormalization(
          args,
          mcpTool.inputSchema
        );
        console.log(`Using fallback normalization:`, fallbackArgs);
        return fallbackArgs;
      } catch (fallbackError) {
        console.error(`Fallback normalization also failed:`, fallbackError);
        throw new Error(
          `Unable to process tool inputs: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  // Comprehensive parameter name normalization (handles multiple naming conventions)
  private normalizeAllParameterNames(args: any, schema: any): any {
    if (!schema || !schema.properties) {
      return args;
    }

    const normalizedArgs: any = {};
    const schemaKeys = Object.keys(schema.properties);

    // Create comprehensive mapping for different naming conventions
    const nameVariationsMap: Record<string, string> = {};

    for (const key of schemaKeys) {
      // Add the key itself
      nameVariationsMap[key] = key;
      nameVariationsMap[key.toLowerCase()] = key;

      // Convert camelCase to snake_case
      const snakeCase = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`
      );
      nameVariationsMap[snakeCase] = key;

      // Convert camelCase to kebab-case
      const kebabCase = key.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
      );
      nameVariationsMap[kebabCase] = key;

      // Convert to PascalCase
      const pascalCase = key.charAt(0).toUpperCase() + key.slice(1);
      nameVariationsMap[pascalCase] = key;

      // Convert to lowercase with spaces
      const spaceCase = key
        .replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)
        .trim();
      nameVariationsMap[spaceCase] = key;

      // Handle common abbreviations and variations
      if (key.includes("Id")) {
        const withID = key.replace("Id", "ID");
        nameVariationsMap[withID] = key;
        nameVariationsMap[
          withID.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        ] = key;
      }
    }

    // Process each input argument
    for (const [inputKey, value] of Object.entries(args)) {
      if (nameVariationsMap[inputKey]) {
        const correctKey = nameVariationsMap[inputKey];
        normalizedArgs[correctKey] = value;
        if (inputKey !== correctKey) {
          console.log(`Normalized parameter: ${inputKey} -> ${correctKey}`);
        }
      } else {
        // Try fuzzy matching for typos
        const fuzzyMatch = this.findFuzzyMatch(inputKey, schemaKeys);
        if (fuzzyMatch) {
          normalizedArgs[fuzzyMatch] = value;
          console.log(`Fuzzy matched parameter: ${inputKey} -> ${fuzzyMatch}`);
        } else {
          // Unknown parameter, keep it but warn
          console.warn(`Unknown parameter ${inputKey} for tool, keeping as-is`);
          normalizedArgs[inputKey] = value;
        }
      }
    }

    // Ensure all required parameters are present with default values if possible
    const required = schema.required || [];
    for (const requiredKey of required) {
      if (!(requiredKey in normalizedArgs)) {
        const defaultValue = this.getDefaultValueForType(
          schema.properties[requiredKey]
        );
        if (defaultValue !== undefined) {
          normalizedArgs[requiredKey] = defaultValue;
          console.log(
            `Added default value for required parameter ${requiredKey}:`,
            defaultValue
          );
        }
      }
    }

    return normalizedArgs;
  }

  // Fuzzy matching for parameter names (handles typos)
  private findFuzzyMatch(input: string, candidates: string[]): string | null {
    const threshold = 0.7; // Similarity threshold
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = this.calculateSimilarity(
        input.toLowerCase(),
        candidate.toLowerCase()
      );
      if (score > threshold && score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  }

  // Calculate string similarity (Levenshtein distance based)
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0
      ? 1
      : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  // Get default values for different types
  private getDefaultValueForType(propSchema: any): any {
    if (!propSchema || !propSchema.type) return undefined;

    switch (propSchema.type) {
      case "string":
        return propSchema.default || "";
      case "number":
      case "integer":
        return propSchema.default || 0;
      case "boolean":
        return propSchema.default !== undefined ? propSchema.default : false;
      case "array":
        return propSchema.default || [];
      case "object":
        return propSchema.default || {};
      default:
        return propSchema.default;
    }
  }

  // Apply tool-specific transformations
  private applyToolSpecificTransformations(args: any, toolName: string): any {
    switch (toolName) {
      case "sequential_thinking":
      case "sequentialthinking":
        return this.transformSequentialThinkingArgs(args);

      case "file_operations":
      case "fileOperations":
        return this.transformFileOperationArgs(args);

      case "git_operations":
      case "gitOperations":
        return this.transformGitOperationArgs(args);

      // Add more tool-specific transformations as needed
      default:
        return args;
    }
  }

  // Sequential thinking specific transformations
  private transformSequentialThinkingArgs(args: any): any {
    const transformed = { ...args };

    // Ensure numeric values are properly formatted
    if ("thoughtNumber" in transformed) {
      transformed.thoughtNumber = Math.max(
        1,
        parseInt(String(transformed.thoughtNumber)) || 1
      );
    }
    if ("totalThoughts" in transformed) {
      transformed.totalThoughts = Math.max(
        1,
        parseInt(String(transformed.totalThoughts)) || 1
      );
    }
    if ("revisesThought" in transformed) {
      transformed.revisesThought = Math.max(
        0,
        parseInt(String(transformed.revisesThought)) || 0
      );
    }
    if ("branchFromThought" in transformed) {
      transformed.branchFromThought = Math.max(
        0,
        parseInt(String(transformed.branchFromThought)) || 0
      );
    }

    // Ensure string values are properly formatted
    if (
      "branchId" in transformed &&
      transformed.branchId !== null &&
      transformed.branchId !== undefined
    ) {
      transformed.branchId = String(transformed.branchId);
    }

    return transformed;
  }

  // File operations specific transformations
  private transformFileOperationArgs(args: any): any {
    const transformed = { ...args };

    // Normalize file paths
    if ("path" in transformed || "filePath" in transformed) {
      const path = transformed.path || transformed.filePath;
      if (path) {
        transformed.path = String(path).replace(/\\/g, "/"); // Normalize path separators
      }
    }

    return transformed;
  }

  // Git operations specific transformations
  private transformGitOperationArgs(args: any): any {
    const transformed = { ...args };

    // Ensure branch names are strings
    if ("branch" in transformed) {
      transformed.branch = String(transformed.branch || "main");
    }

    return transformed;
  }

  // Fallback parameter normalization (last resort)
  private fallbackParameterNormalization(args: any, schema: any): any {
    console.log("Applying fallback parameter normalization...");

    const fallbackArgs: any = {};
    const schemaKeys = Object.keys(schema.properties || {});
    const inputKeys = Object.keys(args);

    // Try to match by position if parameter names are completely different
    if (schemaKeys.length === inputKeys.length) {
      for (let i = 0; i < schemaKeys.length; i++) {
        fallbackArgs[schemaKeys[i]] = args[inputKeys[i]];
        console.log(`Positional mapping: ${inputKeys[i]} -> ${schemaKeys[i]}`);
      }
    } else {
      // Copy all args and let the tool handle validation
      return args;
    }

    return fallbackArgs;
  }

  // Enhanced method to validate and coerce tool input types using Zod with comprehensive error handling
  private validateAndCoerceToolInputs(args: any, zodSchema: z.ZodSchema): any {
    try {
      // Use Zod's parse method which will automatically coerce types and validate
      const validatedArgs = zodSchema.parse(args);
      console.log(`Zod validation successful:`, validatedArgs);
      return validatedArgs;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`Zod validation error:`, error.errors);

        // Try to provide helpful error information and auto-fix common issues
        const fixedArgs = this.attemptAutoFix(args, error, zodSchema);
        if (fixedArgs) {
          try {
            const revalidatedArgs = zodSchema.parse(fixedArgs);
            console.log(`Auto-fix successful:`, revalidatedArgs);
            return revalidatedArgs;
          } catch (refixError) {
            console.error(`Auto-fix failed, using original error`);
          }
        }

        const errorDetails = error.errors
          .map((err) => {
            const path = err.path.length > 0 ? err.path.join(".") : "root";
            const receivedValue = this.getReceivedValueFromError(err);
            return `${path}: ${err.message}${
              receivedValue
                ? ` (received: ${JSON.stringify(receivedValue)})`
                : ""
            }`;
          })
          .join("; ");

        throw new Error(`Schema validation failed: ${errorDetails}`);
      }
      throw error;
    }
  }

  // Get received value from Zod error (safe accessor)
  private getReceivedValueFromError(error: z.ZodIssue): any {
    // Type-safe access to received value based on error type
    if ("received" in error) {
      return (error as any).received;
    }
    return undefined;
  }

  // Attempt to auto-fix common validation errors
  private attemptAutoFix(
    args: any,
    error: z.ZodError,
    schema: z.ZodSchema
  ): any | null {
    const fixedArgs = { ...args };
    let hasChanges = false;

    for (const issue of error.errors) {
      const path = issue.path;
      const pathString = path.join(".");
      const receivedValue = this.getReceivedValueFromError(issue);

      try {
        switch (issue.code) {
          case "invalid_type":
            const expectedType = (issue as any).expected;
            const fixedValue = this.coerceType(receivedValue, expectedType);
            if (fixedValue !== undefined) {
              this.setNestedValue(fixedArgs, path, fixedValue);
              hasChanges = true;
              console.log(
                `Auto-fixed type for ${pathString}: ${receivedValue} -> ${fixedValue} (${expectedType})`
              );
            }
            break;

          case "too_small":
            const minIssue = issue as any;
            if (
              typeof receivedValue === "number" &&
              minIssue.minimum !== undefined
            ) {
              this.setNestedValue(fixedArgs, path, minIssue.minimum);
              hasChanges = true;
              console.log(
                `Auto-fixed minimum value for ${pathString}: ${receivedValue} -> ${minIssue.minimum}`
              );
            }
            break;

          case "too_big":
            const maxIssue = issue as any;
            if (
              typeof receivedValue === "number" &&
              maxIssue.maximum !== undefined
            ) {
              this.setNestedValue(fixedArgs, path, maxIssue.maximum);
              hasChanges = true;
              console.log(
                `Auto-fixed maximum value for ${pathString}: ${receivedValue} -> ${maxIssue.maximum}`
              );
            }
            break;

          case "invalid_string":
            const stringIssue = issue as any;
            if (
              stringIssue.validation === "email" &&
              typeof receivedValue === "string"
            ) {
              // Try to fix common email issues
              const fixed = this.fixEmailFormat(receivedValue);
              if (fixed !== receivedValue) {
                this.setNestedValue(fixedArgs, path, fixed);
                hasChanges = true;
                console.log(
                  `Auto-fixed email format for ${pathString}: ${receivedValue} -> ${fixed}`
                );
              }
            }
            break;
        }
      } catch (fixError) {
        console.warn(`Failed to auto-fix ${pathString}:`, fixError);
      }
    }

    return hasChanges ? fixedArgs : null;
  }

  // Type coercion helper
  private coerceType(value: any, expectedType: string): any {
    switch (expectedType) {
      case "string":
        return value !== null && value !== undefined ? String(value) : "";
      case "number":
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      case "boolean":
        if (typeof value === "string") {
          return (
            value.toLowerCase() === "true" || value === "1" || value === "yes"
          );
        }
        return Boolean(value);
      case "array":
        return Array.isArray(value) ? value : [value];
      case "object":
        return typeof value === "object" && value !== null ? value : {};
      default:
        return value;
    }
  }

  // Set nested value in object using path array
  private setNestedValue(
    obj: any,
    path: (string | number)[],
    value: any
  ): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }
    current[path[path.length - 1]] = value;
  }

  // Fix common email format issues
  private fixEmailFormat(email: string): string {
    return email.trim().toLowerCase();
  }

  // Legacy method updated to use the new comprehensive approach
  private coerceToolInputTypes(args: any, schema: any): any {
    if (!schema || !schema.properties) {
      return args;
    }

    // Use the new comprehensive processing method
    try {
      return this.processToolInputsSync(args, {
        inputSchema: schema,
        name: "legacy_tool",
      });
    } catch (error) {
      console.error(
        `Failed to process tool inputs using new method, falling back:`,
        error
      );

      // Fallback: basic normalization only
      const normalizedArgs = this.normalizeAllParameterNames(args, schema);

      // Then create a Zod schema and validate
      const zodSchema = this.convertJsonSchemaToZod(schema);

      try {
        return this.validateAndCoerceToolInputs(normalizedArgs, zodSchema);
      } catch (validationError) {
        console.error(`Failed to validate tool inputs:`, validationError);
        // Last resort fallback to original args
        return normalizedArgs;
      }
    }
  }

  // Synchronous version of processToolInputs for legacy compatibility
  private processToolInputsSync(args: any, mcpTool: any): any {
    if (!mcpTool.inputSchema || !mcpTool.inputSchema.properties) {
      return args;
    }

    // Step 1: Normalize parameter names
    const normalizedArgs = this.normalizeAllParameterNames(
      args,
      mcpTool.inputSchema
    );

    // Step 2: Validate and coerce types using Zod
    const zodSchema = this.convertJsonSchemaToZod(
      mcpTool.inputSchema,
      mcpTool.name
    );
    const validatedArgs = this.validateAndCoerceToolInputs(
      normalizedArgs,
      zodSchema
    );

    // Step 3: Apply tool-specific transformations
    const finalArgs = this.applyToolSpecificTransformations(
      validatedArgs,
      mcpTool.name
    );

    return finalArgs;
  }
}
