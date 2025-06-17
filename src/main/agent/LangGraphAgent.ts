import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { tool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { ChatWatsonx } from "@langchain/community/chat_models/ibm";
import { MCPManager } from "../mcp/MCPManager";
import { ChatMessage, ToolCall, Tool } from "../../shared/types";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export class LangGraphAgent {
  private mcpManager: MCPManager;
  private model: ChatWatsonx;
  private agent: any = null; // LangGraph agent
  private checkpointer: MemorySaver;
  private tools: any[] = [];
  private isInitialized: boolean = false;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
    this.checkpointer = new MemorySaver(); // Initialize memory for conversations

    // Check for required credentials
    const apiKey = process.env.WATSONX_API_KEY;
    const projectId = process.env.WATSONX_PROJECT_ID;

    if (
      !apiKey ||
      !projectId ||
      apiKey.includes("your_") ||
      projectId.includes("your_")
    ) {
      throw new Error(
        "IBM Watsonx credentials not configured. Please set WATSONX_API_KEY and WATSONX_PROJECT_ID in your .env file."
      );
    }

    const props = {
      version: "2023-05-29",
      serviceUrl:
        process.env.WATSONX_URL || "https://us-south.ml.cloud.ibm.com",
      projectId: projectId,
      watsonxAIAuthType: "iam",
      watsonxAIApikey: apiKey,
      maxTokens: 8000, // Increased for better responses
      temperature: 0.1, // Lower temperature for more consistent tool calling
      topP: 0.9, // Add top_p for better control
      repetitionPenalty: 1.1, // Reduce repetition
    };

    // Initialize IBM Watsonx model
    this.model = new ChatWatsonx({
      model: process.env.WATSONX_MODEL_ID || "ibm/granite-3-3-8b-instruct",
      streaming: false,
      ...props,
    });

    // Initialize agent asynchronously
    this.initializeAgent();
  }

  private async initializeAgent() {
    try {
      await this.setupAgent();
      this.isInitialized = true;
      console.log("LangGraph Agent initialized successfully");
    } catch (error) {
      console.error("Failed to initialize LangGraph Agent:", error);
    }
  }

  private async setupAgent() {
    console.log("LangGraphAgent: Setting up agent with LangGraph...");

    // Get available tools as LangChain tools
    this.tools = await this.getAvailableTools();

    // Handle the case when no tools are available
    if (this.tools.length === 0) {
      console.log(
        "LangGraphAgent: No tools available, creating LLM-only agent"
      );

      // Don't create a React agent when no tools are available
      // Instead, we'll handle this case in processMessage with direct LLM calls
      this.agent = null;
    } else {
      // Create the React agent with tools when tools are available
      this.agent = createReactAgent({
        llm: this.model,
        tools: this.tools,
        checkpointer: this.checkpointer, // Enable memory for conversations
        prompt: `Knowledge Cutoff Date: April 2024.
Today's Date: ${new Date().toLocaleDateString()}.
You are Granite, developed by IBM. You are a helpful assistant with access to the following tools. When a tool is required to answer the user's query, respond with <|tool_call|> followed by a JSON list of tools used.

CRITICAL INSTRUCTIONS FOR TOOL CALLING:
1. When users ask about current time/date -> IMMEDIATELY use time tools
2. When users ask about git/commits/repository -> IMMEDIATELY use git tools  
3. When users ask about files/directories -> IMMEDIATELY use filesystem tools
4. NEVER ask for clarification when you have tools available
5. NEVER provide hypothetical responses

TOOL CALLING FORMAT:
Start response with: <|tool_call|>[{"name": "tool_name", "arguments": {"param": "value"}}]

Available tools:
${this.tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

EXAMPLES:
- User: "what is current date?" -> Call time tool immediately
- User: "what commits were made yesterday?" -> Call git_log tool immediately  
- User: "list files in directory" -> Call filesystem tool immediately

Remember: ACTION FIRST, explanation after. Use tools proactively.`,
      });
    }

    console.log(`LangGraphAgent: Agent set up with ${this.tools.length} tools`);
  }

  private async getAvailableTools(): Promise<any[]> {
    console.log("LangGraphAgent: Getting available tools...");
    const tools: any[] = [];
    const servers = this.mcpManager.listServers();
    console.log("LangGraphAgent: Found servers:", servers);

    // Get tools from all connected servers
    const connectedServers = servers.filter((s) => s.connected);
    console.log("LangGraphAgent: Connected servers:", connectedServers);

    if (connectedServers.length === 0) {
      console.log(
        "LangGraphAgent: No connected servers, returning empty tools array"
      );
      return tools;
    }

    // Get tools from all connected servers
    try {
      const mcpTools = await this.mcpManager.listTools(); // Get tools from all servers
      console.log("LangGraphAgent: Retrieved MCP tools:", mcpTools);

      // Debug: Show server mapping for each tool
      mcpTools.forEach((tool) => {
        console.log(
          `Tool '${tool.name}' belongs to server '${
            tool.serverId
          }' (type: ${typeof tool.serverId})`
        );
      });

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
                console.log(`Tool ${mcpTool.name} input type:`, typeof input);

                // The modern tool() function handles input parsing better
                // Input should already be properly structured object
                const args = input || {};

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

                // Call the MCP tool with the correct parameter order: (name, args, serverId)
                const result = await this.mcpManager.callTool(
                  mcpTool.name, // tool name first
                  args, // args second
                  serverId // serverId third (optional)
                );

                console.log(`Tool ${mcpTool.name} result:`, result);

                // Tools must always return strings according to LangChain docs
                if (typeof result === "string") {
                  return result;
                } else {
                  return JSON.stringify(result, null, 2);
                }
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
          console.log(`Created modern tool for ${mcpTool.name}`);
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

  // Method to check if the agent is ready
  public isReady(): boolean {
    return this.isInitialized && !!this.agent;
  }

  async processMessage(message: string): Promise<ChatMessage> {
    try {
      // Ensure agent is initialized
      if (!this.isInitialized) {
        await this.initializeAgent();
      }

      // Refresh tools in case new servers were connected
      await this.setupAgent();

      console.log(
        "Available tools for agent:",
        this.tools.map((t) => ({
          name: t.name,
          description: t.description?.substring(0, 100) + "...",
        }))
      );

      console.log("Processing message:", message);

      // Handle case when no tools are available (agent is null)
      if (!this.agent || this.tools.length === 0) {
        console.log(
          "LangGraphAgent: No tools available, using direct LLM response"
        );

        // Create a simple system prompt for knowledge-only responses
        const systemPrompt = `Knowledge Cutoff Date: April 2024.
Today's Date: ${new Date().toLocaleDateString()}.
You are Granite, developed by IBM. You are a helpful AI assistant.

Since no MCP tools are currently available, respond using your built-in knowledge. If users ask about specific operations that would require tools (like checking current time, listing files, or git operations), politely explain that those tools are not currently connected and offer to help with other questions.

Be conversational and helpful. You can discuss general knowledge, programming concepts, and provide guidance on various topics.`;

        // Use the LLM directly without tools
        const response = await this.model.invoke([
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ]);

        return {
          id: uuidv4(),
          role: "assistant",
          content: response.content.toString(),
          timestamp: new Date(),
          toolCalls: [],
        };
      }

      // Use React agent when tools are available
      console.log("Processing message with LangGraph React agent:", message);

      // Create a unique thread ID for this conversation
      const threadId = uuidv4();
      const config = { configurable: { thread_id: threadId } };

      // Create a more directive system message for IBM Granite
      const enhancedMessage = this.enhanceMessageForToolCalling(message);

      console.log("Enhanced message:", enhancedMessage);

      // Invoke the LangGraph agent with a more directive approach
      const result = await this.agent.invoke(
        {
          messages: [{ role: "user", content: enhancedMessage }],
        },
        config
      );

      console.log("Agent result:", result);

      // Extract the final response from the agent
      let content = "No response generated";
      const toolCalls: ToolCall[] = [];

      if (result.messages && result.messages.length > 0) {
        // Get the last message from the agent
        const lastMessage = result.messages[result.messages.length - 1];
        content = lastMessage.content || "No response generated";

        // Extract tool calls from the conversation (standard way)
        for (const msg of result.messages) {
          if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
            for (const toolCall of msg.tool_calls) {
              toolCalls.push({
                id: toolCall.id || uuidv4(),
                name: toolCall.name,
                args: toolCall.args,
                serverId: "unknown",
              });
            }
          }
        }

        // If no standard tool calls found, try to parse from content (for IBM Granite)
        if (toolCalls.length === 0 && content) {
          const parsedToolCalls = this.parseToolCallsFromContent(content);
          console.log("Parsed tool calls from content:", parsedToolCalls);

          for (const toolCall of parsedToolCalls) {
            try {
              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments);

              console.log(`Executing tool: ${toolName} with args:`, toolArgs);

              // Execute the tool call using MCPManager
              const toolResult = await this.mcpManager.callTool(
                toolName,
                toolArgs
              );
              console.log(`Tool ${toolName} result:`, toolResult);

              toolCalls.push({
                id: toolCall.id,
                name: toolName,
                args: toolArgs,
                serverId: "",
                result: toolResult,
              });
            } catch (error: any) {
              console.error(
                `Error executing tool ${toolCall.function.name}:`,
                error
              );
              toolCalls.push({
                id: toolCall.id,
                name: toolCall.function.name,
                args: JSON.parse(toolCall.function.arguments),
                serverId: "",
                result: { error: error?.message || "Unknown error" },
              });
            }
          }

          // If we executed tools, generate a summary response
          if (toolCalls.length > 0) {
            content = this.generateToolExecutionSummary(toolCalls);
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
      console.error("Error processing message:", error);
      return {
        id: uuidv4(),
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  // Method to refresh the agent when tools change
  public async refreshAgent(): Promise<void> {
    console.log("LangGraphAgent: Refreshing agent with updated tools...");
    await this.setupAgent();
    console.log("LangGraphAgent: Agent refreshed successfully");
  }

  // Enhance message to encourage tool calling for IBM Granite
  private enhanceMessageForToolCalling(message: string): string {
    return `${message}

IMPORTANT: Use available time/date tools to get current information. Do not guess or provide hypothetical times.

IMPORTANT: Use git tools to get actual repository information. Check git_log, git_status, or other git tools.`;
  }

  private parseToolCallsFromContent(content: string): any[] {
    const toolCalls: any[] = [];

    try {
      // First try to parse Granite 3.3 format: <|tool_call|>[{...}]
      const graniteToolCallMatch = content.match(
        /<\|tool_call\|>\s*(\[.*?\])/s
      );
      if (graniteToolCallMatch) {
        const toolCallsArray = JSON.parse(graniteToolCallMatch[1]);
        for (const call of toolCallsArray) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: "function",
            function: {
              name: call.name,
              arguments: JSON.stringify(call.arguments),
            },
          });
        }
        return toolCalls;
      }

      // Fallback: Look for JSON objects in the content that match tool call pattern
      const jsonPattern =
        /\{\s*"action":\s*"([^"]+)",\s*"params":\s*\{[^}]*\}(?:,\s*"label":[^}]*)?\s*\}/g;
      let match;

      while ((match = jsonPattern.exec(content)) !== null) {
        try {
          const jsonStr = match[0];
          const toolCall = JSON.parse(jsonStr);

          if (toolCall.action && toolCall.params) {
            toolCalls.push({
              id: `call_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              type: "function",
              function: {
                name: toolCall.action,
                arguments: JSON.stringify(toolCall.params),
              },
            });
          }
        } catch (parseError) {
          console.warn("Failed to parse tool call JSON:", parseError);
        }
      }
    } catch (error) {
      console.warn("Error parsing tool calls from content:", error);
    }

    return toolCalls;
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

      // Make optional if not required OR if it's repo_path for git tools
      const isGitTool = toolName?.startsWith("git_");
      const isRepoPath = key === "repo_path";

      if (!required.includes(key) || (isGitTool && isRepoPath)) {
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

  private generateToolExecutionSummary(toolCalls: any[]): string {
    if (toolCalls.length === 0) {
      return "No tools were executed.";
    }

    let summary = "I've executed the following tools:\n\n";

    for (const toolCall of toolCalls) {
      summary += `**${toolCall.name}**:\n`;

      if (toolCall.result) {
        if (toolCall.result.error) {
          summary += `❌ Error: ${toolCall.result.error}\n`;
        } else if (toolCall.result.content) {
          // Extract key information from tool results
          if (Array.isArray(toolCall.result.content)) {
            for (const content of toolCall.result.content) {
              if (content.type === "text" && content.text) {
                summary += `✅ ${content.text}\n`;
              }
            }
          } else if (typeof toolCall.result.content === "string") {
            summary += `✅ ${toolCall.result.content}\n`;
          } else {
            summary += `✅ Tool executed successfully\n`;
          }
        } else {
          summary += `✅ Tool executed successfully\n`;
        }
      }
      summary += "\n";
    }

    return summary;
  }
}
