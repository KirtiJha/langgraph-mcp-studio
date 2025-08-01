# MCP Server Generation Scripts

This directory contains scripts to automatically generate an MCP (Model Context Protocol) server from the OpenAPI specification.

## Files

- `generate-mcp-server.js` - Main generator script that converts OpenAPI spec to MCP server
- `package.json` - Dependencies for MCP server generation
- `README.md` - This file

## Usage

1. Make sure your API server is running and the OpenAPI spec is available
2. Run the generator script:

```bash
node generate-mcp-server.js [openapi-file] [config-output] [server-output]
```

Example:

```bash
node generate-mcp-server.js ../openapi.yaml ../mcp-server-config.json ../mcp-server.js
```

## Generated Files

- `mcp-server-config.json` - Configuration file with tool and resource definitions
- `mcp-server.js` - Complete MCP server implementation

## Dependencies

The generated MCP server requires these packages:

- `@modelcontextprotocol/sdk` - MCP SDK
- `axios` - HTTP client for API calls

Install them with:

```bash
npm install @modelcontextprotocol/sdk axios
```
