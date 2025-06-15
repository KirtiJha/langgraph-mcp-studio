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
      maxTokens: 500, // Increased for better responses
      temperature: 0.7, // Slightly higher for more creative responses
    };

    // Initialize IBM Watsonx model
    this.model = new ChatWatsonx({
      model:
        process.env.WATSONX_MODEL_ID || "meta-llama/llama-3-3-70b-instruct",
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
    console.log("LangGraphAgent: Setting up React agent with LangGraph...");

    // Get available tools as LangChain tools
    this.tools = await this.getAvailableTools();

    // Create the React agent using LangGraph prebuilt
    this.agent = createReactAgent({
      llm: this.model,
      tools: this.tools,
      checkpointer: this.checkpointer, // Enable memory for conversations
      prompt: `You are a helpful AI assistant with access to various MCP (Model Context Protocol) tools.

Use the available tools to help users accomplish their tasks. When you need to use a tool:
1. Think about which tool would be most appropriate
2. Call the tool with the correct parameters
3. Use the results to provide a helpful response

Available tools: ${this.tools.map((t) => t.name).join(", ")}

Always be helpful and provide clear, informative responses.`,
    });

    console.log(
      `LangGraphAgent: React agent set up with ${this.tools.length} tools`
    );
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
      mcpTools.forEach(tool => {
        console.log(`Tool '${tool.name}' belongs to server '${tool.serverId}'`);
      });

      for (const mcpTool of mcpTools) {
        try {
          // Convert JSON Schema to Zod schema for better type safety
          const zodSchema = this.convertJsonSchemaToZod(mcpTool.inputSchema, mcpTool.name);

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

                // Call the MCP tool with the correct serverId
                const result = await this.mcpManager.callTool(
                  mcpTool.name,
                  args,
                  mcpTool.serverId // Pass the serverId to ensure correct routing
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
      if (!this.isInitialized || !this.agent) {
        await this.initializeAgent();

        if (!this.agent) {
          throw new Error("Failed to initialize agent");
        }
      }

      // Refresh tools in case new servers were connected
      await this.setupAgent();

      console.log("Processing message with LangGraph React agent:", message);

      // Create a unique thread ID for this conversation
      const threadId = uuidv4();
      const config = { configurable: { thread_id: threadId } };

      // Invoke the LangGraph agent
      const result = await this.agent.invoke(
        {
          messages: [{ role: "user", content: message }],
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

        // Extract tool calls from the conversation
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

  // Convert JSON Schema to Zod schema for better type safety
  private convertJsonSchemaToZod(jsonSchema: any, toolName?: string): z.ZodSchema {
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
      const isGitTool = toolName?.startsWith('git_');
      const isRepoPath = key === 'repo_path';
      
      if (!required.includes(key) || (isGitTool && isRepoPath)) {
        zodSchema = zodSchema.optional();
      }

      zodProperties[key] = zodSchema;
    }

    return z.object(zodProperties);
  }

  private enhanceToolDescription(tool: Tool): string {
    let description = tool.description || "No description available";
    
    // For git tools, add context about automatic repo_path injection
    if (tool.name.startsWith('git_')) {
      description += "\n\nNote: The repository path is automatically configured and doesn't need to be specified. You can call this tool without providing repo_path parameter.";
      
      // Remove repo_path from required parameters in the description if present
      if (description.includes('repo_path')) {
        description = description.replace(/repo_path[^,.\n]*/g, '');
        description = description.replace(/,\s*,/g, ','); // Clean up double commas
        description = description.replace(/^,\s*/gm, ''); // Clean up leading commas
      }
    }
    
    return description;
  }
}
