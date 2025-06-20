#!/bin/bash

# Quick MCP connection script for Claude Code
# Uses the already running Docker container

set -e

# Check if the MCP server container is running
if ! docker ps --format "{{.Names}}" | grep -q "^mcp-code-validator$"; then
    echo "❌ MCP server container not running. Start with: ./docker-manage.sh start" >&2
    exit 1
fi

# Execute the MCP server directly in the running container
exec docker exec -i mcp-code-validator node dist/server.js