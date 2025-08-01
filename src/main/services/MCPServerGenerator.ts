import * as fs from "fs/promises";
import * as path from "path";
import { ServerStorageService } from "./ServerStorageService";
import { ServerConfig } from "../../shared/types";

export interface MCPServerConfig {
  name: string;
  description: string;
  version: string;
  language: "typescript" | "python";
  transport: "stdio" | "sse" | "streamable-http";
  authentication: "none" | "oauth" | "bearer" | "apikey";
  includeTools: boolean;
  includeResources: boolean;
  includePrompts: boolean;
  toolNames?: string[];
  resourceNames?: string[];
  promptNames?: string[];
  authConfig?: {
    scopes?: string[];
    issuerUrl?: string;
    clientId?: string;
  };
}

export interface GeneratedServer {
  serverId: string;
  files: GeneratedFile[];
  startCommand: string;
  installCommand: string;
  documentation: string;
  serverConfig: ServerConfig;
}

export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

export class MCPServerGenerator {
  private static instance: MCPServerGenerator;
  private storageService: ServerStorageService;

  private constructor() {
    this.storageService = ServerStorageService.getInstance();
  }

  public static getInstance(): MCPServerGenerator {
    if (!MCPServerGenerator.instance) {
      MCPServerGenerator.instance = new MCPServerGenerator();
    }
    return MCPServerGenerator.instance;
  }

  /**
   * Generate a complete MCP server with boilerplate code
   */
  async generateServer(config: MCPServerConfig): Promise<GeneratedServer> {
    const serverId = `generated-${config.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
    const serverPath = this.storageService.getServerPath(serverId);

    // Ensure server directory exists
    await fs.mkdir(serverPath, { recursive: true });

    const files: GeneratedFile[] = [];

    if (config.language === "typescript") {
      files.push(...(await this.generateTypeScriptServer(config, serverPath)));
    } else {
      files.push(...(await this.generatePythonServer(config, serverPath)));
    }

    // Write all files to disk
    for (const file of files) {
      const filePath = path.join(serverPath, file.path);
      const fileDir = path.dirname(filePath);
      await fs.mkdir(fileDir, { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");
    }

    const startCommand = this.getStartCommand(config);
    const installCommand = this.getInstallCommand(config);
    const documentation = this.generateDocumentation(
      config,
      startCommand,
      installCommand
    );

    // Create server configuration for MCP manager
    const mainFileName =
      config.language === "typescript" ? "server.ts" : "server.py";
    const serverConfig: ServerConfig = {
      id: serverId,
      name: config.name,
      type: "stdio",
      command:
        config.language === "typescript"
          ? "npm"
          : config.language === "python"
          ? "python"
          : "node",
      args: config.language === "typescript" ? ["run", "dev"] : [mainFileName],
      env: {},
      enabled: true,
      autoRestart: true,
      timeout: 30000,
      metadata: {
        generated: true,
        language: config.language,
        transport: config.transport,
        authentication: config.authentication,
        generatedAt: new Date().toISOString(),
      },
    };

    return {
      serverId,
      files,
      startCommand,
      installCommand,
      documentation,
      serverConfig,
    };
  }

  /**
   * Generate TypeScript MCP server files
   */
  private async generateTypeScriptServer(
    config: MCPServerConfig,
    serverPath: string
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Package.json
    files.push({
      path: "package.json",
      content: this.generateTypeScriptPackageJson(config),
      description: "Node.js package configuration with MCP SDK dependencies",
    });

    // Main server file
    files.push({
      path: "server.ts",
      content: this.generateTypeScriptMainFile(config),
      description: "Main MCP server implementation",
    });

    // TypeScript configuration
    files.push({
      path: "tsconfig.json",
      content: this.generateTypeScriptConfig(),
      description: "TypeScript compiler configuration",
    });

    // Environment example
    files.push({
      path: ".env.example",
      content: this.generateTypeScriptEnvExample(config),
      description: "Environment variables template",
    });

    // README
    files.push({
      path: "README.md",
      content: this.generateTypeScriptReadme(config),
      description: "Documentation and setup instructions",
    });

    // Build script
    files.push({
      path: "build.js",
      content: this.generateTypeScriptBuildScript(),
      description: "Build script for the MCP server",
    });

    return files;
  }

  /**
   * Generate Python MCP server files
   */
  private async generatePythonServer(
    config: MCPServerConfig,
    serverPath: string
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Main server file
    files.push({
      path: "server.py",
      content: this.generatePythonMainFile(config),
      description: "Main MCP server implementation",
    });

    // Requirements.txt
    files.push({
      path: "requirements.txt",
      content: this.generatePythonRequirements(config),
      description: "Python package dependencies",
    });

    // Pyproject.toml (modern Python packaging)
    files.push({
      path: "pyproject.toml",
      content: this.generatePythonPyproject(config),
      description: "Modern Python project configuration",
    });

    // Environment example
    files.push({
      path: ".env.example",
      content: this.generatePythonEnvExample(config),
      description: "Environment variables template",
    });

    // README
    files.push({
      path: "README.md",
      content: this.generatePythonReadme(config),
      description: "Documentation and setup instructions",
    });

    return files;
  }

  /**
   * Generate TypeScript package.json
   */
  private generateTypeScriptPackageJson(config: MCPServerConfig): string {
    const dependencies: Record<string, string> = {
      "@modelcontextprotocol/sdk": "^1.0.0",
      zod: "^3.22.0",
    };

    const devDependencies: Record<string, string> = {
      "@types/node": "^20.0.0",
      typescript: "^5.0.0",
      tsx: "^4.0.0",
    };

    // Add transport-specific dependencies
    if (config.transport === "sse" || config.transport === "streamable-http") {
      dependencies["express"] = "^4.18.0";
      devDependencies["@types/express"] = "^4.17.0";
    }

    // Add authentication dependencies
    if (config.authentication === "oauth") {
      dependencies["jsonwebtoken"] = "^9.0.0";
      devDependencies["@types/jsonwebtoken"] = "^9.0.0";
    }

    return JSON.stringify(
      {
        name: config.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        version: config.version,
        description: config.description,
        type: "module",
        main: "dist/index.js",
        scripts: {
          build: "tsc",
          dev: "tsx server.ts",
          start: "node dist/server.js",
        },
        dependencies,
        devDependencies,
      },
      null,
      2
    );
  }

  /**
   * Generate TypeScript main server file
   */
  private generateTypeScriptMainFile(config: MCPServerConfig): string {
    let imports = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";`;

    let transportSetup = "";
    let serverSetup = "";

    // Add transport-specific imports and setup
    if (config.transport === "stdio") {
      imports += `\nimport { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";`;
      transportSetup = `
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("${config.name} MCP server running on stdio");
}`;
    } else if (config.transport === "sse") {
      imports += `\nimport { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";`;
      transportSetup = `
async function main() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  app.get('/sse', (req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    server.connect(transport);
  });
  
  app.listen(PORT, () => {
    console.log(\`${config.name} MCP server running on http://localhost:\${PORT}/sse\`);
  });
}`;
    } else if (config.transport === "streamable-http") {
      imports += `\nimport { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";`;
      transportSetup = `
async function main() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  app.use(express.json());
  
  const sessions = new Map();
  
  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => Math.random().toString(36).substring(7)
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  
  app.listen(PORT, () => {
    console.log(\`${config.name} MCP server running on http://localhost:\${PORT}/mcp\`);
  });
}`;
    }

    // Add authentication setup if needed
    if (config.authentication === "oauth") {
      serverSetup += `
// OAuth configuration
const OAUTH_CONFIG = {
  issuerUrl: process.env.OAUTH_ISSUER_URL || "",
  scopes: ${JSON.stringify(config.authConfig?.scopes || ["read"])},
};`;
    }

    // Generate server creation
    serverSetup += `
// Create MCP server
const server = new McpServer({
  name: "${config.name}",
  version: "${config.version}"
});`;

    // Generate tools
    let toolsCode = "";
    if (config.includeTools && config.toolNames?.length) {
      toolsCode = config.toolNames
        .map(
          (toolName) => `
// ${toolName} tool
server.registerTool(
  "${toolName.toLowerCase().replace(/[^a-z0-9]/g, "-")}",
  {
    title: "${toolName}",
    description: "Execute ${toolName.toLowerCase()} operation",
    inputSchema: {
      input: z.string().describe("Input for ${toolName.toLowerCase()}")
    }
  },
  async ({ input }) => ({
    content: [{
      type: "text",
      text: \`${toolName} executed with input: \${input}\`
    }]
  })
);`
        )
        .join("");
    }

    // Generate resources
    let resourcesCode = "";
    if (config.includeResources && config.resourceNames?.length) {
      resourcesCode = config.resourceNames
        .map(
          (resourceName) => `
// ${resourceName} resource
server.registerResource(
  "${resourceName.toLowerCase()}",
  "${resourceName.toLowerCase()}://{id}",
  {
    title: "${resourceName}",
    description: "Access ${resourceName.toLowerCase()} data"
  },
  async (uri, { id }) => ({
    contents: [{
      uri: uri.href,
      text: \`${resourceName} data for ID: \${id}\`
    }]
  })
);`
        )
        .join("");
    }

    // Generate prompts
    let promptsCode = "";
    if (config.includePrompts && config.promptNames?.length) {
      promptsCode = config.promptNames
        .map(
          (promptName) => `
// ${promptName} prompt
server.registerPrompt(
  "${promptName.toLowerCase().replace(/[^a-z0-9]/g, "-")}",
  {
    title: "${promptName}",
    description: "Generate ${promptName.toLowerCase()} prompt",
    argsSchema: {
      context: z.string().describe("Context for ${promptName.toLowerCase()}")
    }
  },
  ({ context }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: \`Please help with ${promptName.toLowerCase()}: \${context}\`
      }
    }]
  })
);`
        )
        .join("");
    }

    const errorHandling = `
main().catch(error => {
  console.error("Server error:", error);
  process.exit(1);
});`;

    return `${imports}

${serverSetup}
${toolsCode}
${resourcesCode}
${promptsCode}
${transportSetup}
${errorHandling}
`;
  }

  /**
   * Generate TypeScript configuration
   */
  private generateTypeScriptConfig(): string {
    return JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          allowImportingTsExtensions: false,
          strict: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: "dist",
          rootDir: ".",
          declaration: true,
          declarationMap: true,
          sourceMap: true,
        },
        include: ["server.ts"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2
    );
  }

  /**
   * Generate TypeScript environment example
   */
  private generateTypeScriptEnvExample(config: MCPServerConfig): string {
    let env = `# ${config.name} MCP Server Environment Variables

# Server Configuration
NODE_ENV=development`;

    if (config.transport !== "stdio") {
      env += `\nPORT=3000`;
    }

    if (config.authentication === "oauth") {
      env += `\n\n# OAuth Configuration
OAUTH_ISSUER_URL=https://your-auth-server.com
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret`;
    }

    if (config.authentication === "bearer") {
      env += `\n\n# Bearer Token Authentication
BEARER_TOKEN=your-secret-token`;
    }

    if (config.authentication === "apikey") {
      env += `\n\n# API Key Authentication
API_KEY=your-api-key`;
    }

    return env;
  }

  /**
   * Generate TypeScript README
   */
  private generateTypeScriptReadme(config: MCPServerConfig): string {
    const transportInfo = {
      stdio:
        "Standard Input/Output - suitable for command-line tools and direct integrations",
      sse: "Server-Sent Events - suitable for web applications with real-time updates",
      "streamable-http":
        "Streamable HTTP - modern transport for scalable web deployments",
    };

    return `# ${config.name}

${config.description}

This is a TypeScript MCP (Model Context Protocol) server using the **${
      config.transport
    }** transport.

## Features

${
  config.includeTools
    ? "- ✅ Tools: Execute actions and computations"
    : "- ❌ Tools: Not included"
}
${
  config.includeResources
    ? "- ✅ Resources: Provide contextual data"
    : "- ❌ Resources: Not included"
}
${
  config.includePrompts
    ? "- ✅ Prompts: Interactive templates"
    : "- ❌ Prompts: Not included"
}
- 🔒 Authentication: ${
      config.authentication === "none"
        ? "None"
        : config.authentication.toUpperCase()
    }
- 🚀 Transport: ${config.transport} (${transportInfo[config.transport]})

## Quick Start

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Build the server:**
   \`\`\`bash
   npm run build
   \`\`\`

4. **Run the server:**
   \`\`\`bash
   npm start
   \`\`\`

## Development

Run in development mode with hot reload:
\`\`\`bash
npm run dev
\`\`\`

## Installation in Claude Desktop

Add to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "${config.name.toLowerCase()}": {
      "command": "node",
      "args": ["${process.cwd()}/dist/index.js"]${
      config.authentication !== "none"
        ? ',\n      "env": {\n        "AUTH_TOKEN": "your-token-here"\n      }'
        : ""
    }
    }
  }
}
\`\`\`

## API Reference

${
  config.includeTools && config.toolNames?.length
    ? `
### Tools

${config.toolNames
  .map((name) => `- **${name}**: Execute ${name.toLowerCase()} operation`)
  .join("\n")}`
    : ""
}

${
  config.includeResources && config.resourceNames?.length
    ? `
### Resources

${config.resourceNames
  .map(
    (name) =>
      `- **${name}**: Access ${name.toLowerCase()} data via \`${name.toLowerCase()}://{id}\``
  )
  .join("\n")}`
    : ""
}

${
  config.includePrompts && config.promptNames?.length
    ? `
### Prompts

${config.promptNames
  .map((name) => `- **${name}**: Generate ${name.toLowerCase()} prompt`)
  .join("\n")}`
    : ""
}

## License

MIT
`;
  }

  /**
   * Generate TypeScript build script
   */
  private generateTypeScriptBuildScript(): string {
    return `import { build } from 'esbuild';

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: 'dist',
  external: ['@modelcontextprotocol/sdk'],
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production'
});
`;
  }

  /**
   * Generate Python main server file
   */
  private generatePythonMainFile(config: MCPServerConfig): string {
    let imports = `import asyncio
import os
from typing import Any, Dict, List, Optional

from mcp.server.fastmcp import FastMCP`;

    let serverSetup = "";
    let mainFunction = "";

    // Add transport-specific imports and setup
    if (config.transport === "stdio") {
      mainFunction = `
async def main():
    """Run the MCP server."""
    await mcp.run()

if __name__ == "__main__":
    asyncio.run(main())`;
    } else if (config.transport === "sse") {
      imports += `\nfrom mcp.server.fastmcp import FastMCP`;
      mainFunction = `
async def main():
    """Run the MCP server with SSE transport."""
    await mcp.run(transport="sse")

if __name__ == "__main__":
    asyncio.run(main())`;
    } else if (config.transport === "streamable-http") {
      imports += `\nfrom mcp.server.fastmcp import FastMCP`;
      mainFunction = `
async def main():
    """Run the MCP server with Streamable HTTP transport."""
    await mcp.run(transport="streamable-http")

if __name__ == "__main__":
    asyncio.run(main())`;
    }

    // Add authentication setup if needed
    if (config.authentication === "oauth") {
      imports += `\nfrom mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from pydantic import AnyHttpUrl`;

      serverSetup += `

class CustomTokenVerifier(TokenVerifier):
    """Custom token verifier for OAuth authentication."""
    
    async def verify_token(self, token: str) -> AccessToken | None:
        """Verify the provided token."""
        # Implement your token verification logic here
        # This is a placeholder implementation
        if token == os.getenv("VALID_TOKEN", ""):
            return AccessToken(
                token=token,
                scopes=["read", "write"],
                client_id="your-client-id"
            )
        return None

# Create FastMCP instance with authentication
mcp = FastMCP(
    "${config.name}",
    token_verifier=CustomTokenVerifier(),
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(os.getenv("OAUTH_ISSUER_URL", "https://auth.example.com")),
        resource_server_url=AnyHttpUrl(os.getenv("SERVER_URL", "http://localhost:8000")),
        required_scopes=${JSON.stringify(
          config.authConfig?.scopes || ["read"]
        )},
    ),
)`;
    } else {
      serverSetup += `
# Create FastMCP server instance
mcp = FastMCP("${config.name}")`;
    }

    // Generate tools
    let toolsCode = "";
    if (config.includeTools && config.toolNames?.length) {
      toolsCode = config.toolNames
        .map(
          (toolName) => `

@mcp.tool()
def ${toolName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")}(input_data: str) -> str:
    """Execute ${toolName} operation."""
    return f"${toolName} executed with input: {input_data}"`
        )
        .join("");
    }

    // Generate resources
    let resourcesCode = "";
    if (config.includeResources && config.resourceNames?.length) {
      resourcesCode = config.resourceNames
        .map(
          (resourceName) => `

@mcp.resource("${resourceName.toLowerCase()}://{resource_id}")
def get_${resourceName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")}(resource_id: str) -> str:
    """Get ${resourceName} resource by ID."""
    return f"${resourceName} data for ID: {resource_id}"`
        )
        .join("");
    }

    // Generate prompts
    let promptsCode = "";
    if (config.includePrompts && config.promptNames?.length) {
      promptsCode = config.promptNames
        .map(
          (promptName) => `

@mcp.prompt()
def ${promptName
            .toLowerCase()
            .replace(
              /[^a-z0-9]/g,
              "_"
            )}_prompt(context: str = "general") -> str:
    """Generate ${promptName} prompt."""
    return f"Please help with ${promptName.toLowerCase()}: {context}"`
        )
        .join("");
    }

    return `${imports}

${serverSetup}
${toolsCode}
${resourcesCode}
${promptsCode}
${mainFunction}
`;
  }

  /**
   * Generate Python requirements.txt
   */
  private generatePythonRequirements(config: MCPServerConfig): string {
    let requirements = `# MCP Python SDK
mcp>=1.0.0

# Core dependencies
pydantic>=2.0.0
typing-extensions>=4.0.0`;

    if (config.authentication === "oauth") {
      requirements += `\n\n# Authentication
pyjwt>=2.8.0
cryptography>=41.0.0`;
    }

    if (config.transport === "sse" || config.transport === "streamable-http") {
      requirements += `\n\n# Web server
uvicorn>=0.24.0
fastapi>=0.104.0`;
    }

    return requirements;
  }

  /**
   * Generate Python pyproject.toml
   */
  private generatePythonPyproject(config: MCPServerConfig): string {
    return `[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "${config.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}"
version = "${config.version}"
description = "${config.description}"
requires-python = ">=3.10"
dependencies = [
    "mcp>=1.0.0",
    "pydantic>=2.0.0",
    "typing-extensions>=4.0.0",
${
  config.authentication === "oauth"
    ? '    "pyjwt>=2.8.0",\n    "cryptography>=41.0.0",'
    : ""
}
${
  config.transport !== "stdio"
    ? '    "uvicorn>=0.24.0",\n    "fastapi>=0.104.0",'
    : ""
}
]

[project.scripts]
${config.name.toLowerCase().replace(/[^a-z0-9]/g, "-")} = "server:main"

[tool.hatch.build.targets.wheel]
packages = ["."]
`;
  }

  /**
   * Generate Python environment example
   */
  private generatePythonEnvExample(config: MCPServerConfig): string {
    let env = `# ${config.name} MCP Server Environment Variables

# Server Configuration
ENVIRONMENT=development`;

    if (config.transport !== "stdio") {
      env += `\nPORT=8000
HOST=localhost`;
    }

    if (config.authentication === "oauth") {
      env += `\n\n# OAuth Configuration
OAUTH_ISSUER_URL=https://your-auth-server.com
SERVER_URL=http://localhost:8000
VALID_TOKEN=your-valid-token-for-testing`;
    }

    if (config.authentication === "bearer") {
      env += `\n\n# Bearer Token Authentication
BEARER_TOKEN=your-secret-token`;
    }

    if (config.authentication === "apikey") {
      env += `\n\n# API Key Authentication
API_KEY=your-api-key`;
    }

    return env;
  }

  /**
   * Generate Python README
   */
  private generatePythonReadme(config: MCPServerConfig): string {
    const transportInfo = {
      stdio:
        "Standard Input/Output - suitable for command-line tools and direct integrations",
      sse: "Server-Sent Events - suitable for web applications with real-time updates",
      "streamable-http":
        "Streamable HTTP - modern transport for scalable web deployments",
    };

    return `# ${config.name}

${config.description}

This is a Python MCP (Model Context Protocol) server using the **${
      config.transport
    }** transport.

## Features

${
  config.includeTools
    ? "- ✅ Tools: Execute actions and computations"
    : "- ❌ Tools: Not included"
}
${
  config.includeResources
    ? "- ✅ Resources: Provide contextual data"
    : "- ❌ Resources: Not included"
}
${
  config.includePrompts
    ? "- ✅ Prompts: Interactive templates"
    : "- ❌ Prompts: Not included"
}
- 🔒 Authentication: ${
      config.authentication === "none"
        ? "None"
        : config.authentication.toUpperCase()
    }
- 🚀 Transport: ${config.transport} (${transportInfo[config.transport]})

## Quick Start

1. **Install dependencies:**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

   Or using uv (recommended):
   \`\`\`bash
   uv sync
   \`\`\`

2. **Set up environment:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Run the server:**
   \`\`\`bash
   python server.py
   \`\`\`

   Or using uv:
   \`\`\`bash
   uv run server.py
   \`\`\`

## Development

For development with auto-reload:
\`\`\`bash
uv run server.py --reload
\`\`\`

## Installation in Claude Desktop

Add to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "${config.name.toLowerCase()}": {
      "command": "python",
      "args": ["${process.cwd()}/server.py"]${
      config.authentication !== "none"
        ? ',\n      "env": {\n        "AUTH_TOKEN": "your-token-here"\n      }'
        : ""
    }
    }
  }
}
\`\`\`

Or using uv:
\`\`\`json
{
  "mcpServers": {
    "${config.name.toLowerCase()}": {
      "command": "uv",
      "args": ["run", "server.py"]${
        config.authentication !== "none"
          ? ',\n      "env": {\n        "AUTH_TOKEN": "your-token-here"\n      }'
          : ""
      }
    }
  }
}
\`\`\`

## API Reference

${
  config.includeTools && config.toolNames?.length
    ? `
### Tools

${config.toolNames
  .map((name) => `- **${name}**: Execute ${name.toLowerCase()} operation`)
  .join("\n")}`
    : ""
}

${
  config.includeResources && config.resourceNames?.length
    ? `
### Resources

${config.resourceNames
  .map(
    (name) =>
      `- **${name}**: Access ${name.toLowerCase()} data via \`${name.toLowerCase()}://{id}\``
  )
  .join("\n")}`
    : ""
}

${
  config.includePrompts && config.promptNames?.length
    ? `
### Prompts

${config.promptNames
  .map((name) => `- **${name}**: Generate ${name.toLowerCase()} prompt`)
  .join("\n")}`
    : ""
}

## License

MIT
`;
  }

  /**
   * Get start command for the generated server
   */
  private getStartCommand(config: MCPServerConfig): string {
    if (config.language === "typescript") {
      return "npm run dev";
    } else {
      return "python server.py";
    }
  }

  /**
   * Get install command for the generated server
   */
  private getInstallCommand(config: MCPServerConfig): string {
    if (config.language === "typescript") {
      return "npm install";
    } else {
      return "pip install -r requirements.txt";
    }
  }

  /**
   * Generate comprehensive documentation
   */
  private generateDocumentation(
    config: MCPServerConfig,
    startCommand: string,
    installCommand: string
  ): string {
    return `# ${config.name} - Generated MCP Server

## Overview
This MCP server was generated with the following configuration:
- **Language**: ${config.language}
- **Transport**: ${config.transport}
- **Authentication**: ${config.authentication}
- **Version**: ${config.version}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   ${installCommand}
   \`\`\`

2. Configure environment variables (copy .env.example to .env)

3. Start the server:
   \`\`\`bash
   ${startCommand}
   \`\`\`

## Capabilities

This server includes:
${
  config.includeTools
    ? `- **Tools**: ${
        config.toolNames?.length || 0
      } tools for executing actions`
    : "- **Tools**: Not included"
}
${
  config.includeResources
    ? `- **Resources**: ${
        config.resourceNames?.length || 0
      } resources for providing data`
    : "- **Resources**: Not included"
}
${
  config.includePrompts
    ? `- **Prompts**: ${
        config.promptNames?.length || 0
      } prompts for interactive templates`
    : "- **Prompts**: Not included"
}

## Next Steps

1. Customize the generated code to implement your specific business logic
2. Add error handling and validation as needed
3. Test the server with MCP clients
4. Deploy to your preferred hosting platform

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP Specification](https://spec.modelcontextprotocol.io)
- [Example Servers](https://github.com/modelcontextprotocol/servers)
`;
  }
}
