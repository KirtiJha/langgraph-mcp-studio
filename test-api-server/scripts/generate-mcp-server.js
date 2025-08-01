#!/usr/bin/env node

/**
 * MCP Server Generator for Test API
 * 
 * This script converts the OpenAPI specification to an MCP server configuration.
 * It maps HTTP endpoints to MCP tools and creates appropriate tool definitions.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class MCPServerGenerator {
  constructor(openApiPath) {
    this.openApiSpec = this.loadOpenApiSpec(openApiPath);
    this.mcpTools = [];
    this.mcpResources = [];
  }

  loadOpenApiSpec(filePath) {
    try {
      const yamlContent = fs.readFileSync(filePath, 'utf8');
      return yaml.load(yamlContent);
    } catch (error) {
      console.error('Failed to load OpenAPI specification:', error);
      process.exit(1);
    }
  }

  generateMCPTools() {
    const paths = this.openApiSpec.paths;
    
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (typeof operation !== 'object' || !operation.operationId) continue;
        
        const tool = this.createMCPTool(path, method, operation);
        this.mcpTools.push(tool);
      }
    }
  }

  createMCPTool(path, method, operation) {
    const toolName = operation.operationId;
    const description = operation.summary || operation.description || `${method.toUpperCase()} ${path}`;
    
    // Extract parameters from OpenAPI operation
    const parameters = this.extractParameters(operation);
    
    // Extract request body schema if present
    if (operation.requestBody && method !== 'get') {
      const requestBodyParams = this.extractRequestBodyParameters(operation.requestBody);
      parameters.properties = { ...parameters.properties, ...requestBodyParams.properties };
      parameters.required = [...(parameters.required || []), ...(requestBodyParams.required || [])];
    }

    return {
      name: toolName,
      description: description,
      inputSchema: {
        type: "object",
        properties: parameters.properties || {},
        required: parameters.required || []
      },
      httpConfig: {
        method: method.toUpperCase(),
        path: path,
        baseUrl: this.openApiSpec.servers?.[0]?.url || 'http://localhost:3001'
      }
    };
  }

  extractParameters(operation) {
    const properties = {};
    const required = [];

    // Path parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        properties[param.name] = {
          type: param.schema?.type || 'string',
          description: param.description || `${param.in} parameter`
        };
        
        if (param.schema?.pattern) {
          properties[param.name].pattern = param.schema.pattern;
        }
        
        if (param.schema?.enum) {
          properties[param.name].enum = param.schema.enum;
        }
        
        if (param.required) {
          required.push(param.name);
        }
      }
    }

    return { properties, required };
  }

  extractRequestBodyParameters(requestBody) {
    const properties = {};
    const required = [];

    const jsonContent = requestBody.content?.['application/json'];
    if (jsonContent?.schema) {
      const schema = this.resolveSchemaRef(jsonContent.schema);
      
      if (schema.properties) {
        Object.assign(properties, schema.properties);
      }
      
      if (schema.required) {
        required.push(...schema.required);
      }
    }

    return { properties, required };
  }

  resolveSchemaRef(schema) {
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/components/schemas/', '');
      return this.openApiSpec.components?.schemas?.[refPath] || schema;
    }
    return schema;
  }

  generateMCPResources() {
    // Create resources for each collection
    const collections = ['users', 'chats', 'messages', 'feedbacks'];
    
    for (const collection of collections) {
      this.mcpResources.push({
        uri: `mongodb://collection/${collection}`,
        name: `MongoDB ${collection} collection`,
        description: `Access to the ${collection} collection in MongoDB`,
        mimeType: "application/json"
      });
    }

    // Add health resource
    this.mcpResources.push({
      uri: "health://status",
      name: "Server Health Status",
      description: "Current health status of the API server and database",
      mimeType: "application/json"
    });
  }

  generateMCPServerConfig() {
    this.generateMCPTools();
    this.generateMCPResources();

    const mcpConfig = {
      name: "mcp-test-api-server",
      version: "1.0.0",
      description: "MCP server for testing API functionality with MongoDB backend",
      tools: this.mcpTools,
      resources: this.mcpResources,
      prompts: [
        {
          name: "analyze_user_feedback",
          description: "Analyze user feedback patterns and generate insights",
          arguments: [
            {
              name: "userId",
              description: "User ID to analyze feedback for",
              required: false
            },
            {
              name: "timeRange",
              description: "Time range for analysis (e.g., '7d', '30d')",
              required: false
            }
          ]
        },
        {
          name: "chat_summary",
          description: "Generate a summary of chat conversations",
          arguments: [
            {
              name: "chatId",
              description: "Chat ID to summarize",
              required: true
            }
          ]
        }
      ]
    };

    return mcpConfig;
  }

  saveConfig(outputPath) {
    const config = this.generateMCPServerConfig();
    fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
    console.log(`MCP server configuration saved to: ${outputPath}`);
    console.log(`Generated ${this.mcpTools.length} tools and ${this.mcpResources.length} resources`);
  }

  generateMCPServerImplementation() {
    const template = `#!/usr/bin/env node

/**
 * MCP Server Implementation
 * Generated from OpenAPI specification
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

class MCPTestAPIServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-test-api-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: ${JSON.stringify(this.mcpTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        })), null, 10)}
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const tool = this.findTool(name);
        if (!tool) {
          throw new Error(\`Unknown tool: \${name}\`);
        }

        const result = await this.executeTool(tool, args);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new Error(\`Tool execution failed: \${error.message}\`);
      }
    });
  }

  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: ${JSON.stringify(this.mcpResources, null, 10)}
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        const content = await this.readResource(uri);
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(content, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new Error(\`Resource read failed: \${error.message}\`);
      }
    });
  }

  setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'analyze_user_feedback',
            description: 'Analyze user feedback patterns and generate insights'
          },
          {
            name: 'chat_summary',
            description: 'Generate a summary of chat conversations'
          }
        ]
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'analyze_user_feedback':
          return this.analyzeUserFeedbackPrompt(args);
        case 'chat_summary':
          return this.chatSummaryPrompt(args);
        default:
          throw new Error(\`Unknown prompt: \${name}\`);
      }
    });
  }

  findTool(name) {
    const tools = ${JSON.stringify(this.mcpTools, null, 6)};
    return tools.find(tool => tool.name === name);
  }

  async executeTool(tool, args) {
    const { method, path, baseUrl } = tool.httpConfig;
    
    // Build URL with path parameters
    let url = baseUrl + path;
    const pathParams = {};
    const queryParams = {};
    const bodyData = {};
    
    // Separate parameters by type
    Object.entries(args || {}).forEach(([key, value]) => {
      if (path.includes(\`{\${key}}\`)) {
        pathParams[key] = value;
        url = url.replace(\`{\${key}}\`, value);
      } else if (['page', 'limit', 'rating', 'isUpvoted', 'hasJiraIssue', 'sortBy', 'sortOrder', 'userId', 'userEmail'].includes(key)) {
        queryParams[key] = value;
      } else {
        bodyData[key] = value;
      }
    });

    const config = {
      method: method.toLowerCase(),
      url,
      params: queryParams,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && Object.keys(bodyData).length > 0) {
      config.data = bodyData;
    }

    const response = await axios(config);
    return response.data;
  }

  async readResource(uri) {
    if (uri.startsWith('mongodb://collection/')) {
      const collection = uri.replace('mongodb://collection/', '');
      const response = await axios.get(\`\${API_BASE_URL}/api/\${collection}\`);
      return response.data;
    } else if (uri === 'health://status') {
      const response = await axios.get(\`\${API_BASE_URL}/api/health\`);
      return response.data;
    } else {
      throw new Error(\`Unknown resource URI: \${uri}\`);
    }
  }

  async analyzeUserFeedbackPrompt(args) {
    const { userId, timeRange } = args || {};
    
    let prompt = \`Analyze user feedback patterns\`;
    if (userId) {
      prompt += \` for user \${userId}\`;
    }
    if (timeRange) {
      prompt += \` over the last \${timeRange}\`;
    }
    
    prompt += \`.

Please examine:
1. Overall sentiment trends
2. Common issues or complaints
3. Feature requests
4. User satisfaction metrics
5. Jira issue correlation if available

Use the available feedback data to provide actionable insights.\`;

    return {
      description: 'User feedback analysis prompt',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt
          }
        }
      ]
    };
  }

  async chatSummaryPrompt(args) {
    const { chatId } = args || {};
    
    if (!chatId) {
      throw new Error('chatId is required for chat summary');
    }
    
    const prompt = \`Please summarize the conversation in chat \${chatId}.

Include:
1. Main topics discussed
2. Key decisions made
3. Action items or follow-ups
4. Overall tone and outcome

Use the messages from this chat to create a concise but comprehensive summary.\`;

    return {
      description: 'Chat conversation summary prompt',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt
          }
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Test API Server running on stdio');
  }
}

// Start the server
const server = new MCPTestAPIServer();
server.run().catch(console.error);
`;

    return template;
  }

  saveMCPServerImplementation(outputPath) {
    const implementation = this.generateMCPServerImplementation();
    fs.writeFileSync(outputPath, implementation);
    fs.chmodSync(outputPath, '755');
    console.log(`MCP server implementation saved to: ${outputPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const openApiPath = process.argv[2] || './openapi.yaml';
  const configOutputPath = process.argv[3] || './mcp-server-config.json';
  const serverOutputPath = process.argv[4] || './mcp-server.js';

  if (!fs.existsSync(openApiPath)) {
    console.error(`OpenAPI file not found: ${openApiPath}`);
    process.exit(1);
  }

  console.log('Generating MCP server from OpenAPI specification...');
  
  const generator = new MCPServerGenerator(openApiPath);
  generator.saveConfig(configOutputPath);
  generator.saveMCPServerImplementation(serverOutputPath);
  
  console.log('\\nMCP server generated successfully!');
  console.log('\\nNext steps:');
  console.log('1. Install MCP dependencies: npm install @modelcontextprotocol/sdk axios');
  console.log('2. Start your API server: npm start');
  console.log(\`3. Test the MCP server: node \${serverOutputPath}\`);
  console.log('4. Configure your MCP client to use this server');
}

module.exports = MCPServerGenerator;
