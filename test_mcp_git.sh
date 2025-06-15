#!/bin/bash

cd "/Users/kirtijha/langgraph-interrupt-app"

echo "Testing MCP git server..."

# Create JSON-RPC messages
cat << 'EOF' | uvx mcp-server-git --repository /Users/kirtijha/langgraph-interrupt-app
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}}
{"jsonrpc": "2.0", "method": "notifications/initialized"}
{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "git_log", "arguments": {}}}
EOF
