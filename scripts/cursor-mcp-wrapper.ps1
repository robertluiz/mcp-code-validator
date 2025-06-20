# MCP Wrapper Script for Cursor on Windows
# This script allows Cursor to communicate with the MCP server running in Docker

param()

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String "mcp-code-validator"

if (-not $containerRunning) {
    Write-Error "MCP container is not running. Please start it with: .\docker-manage.ps1 start"
    exit 1
}

# Execute the MCP server inside the running Docker container
# The -i flag enables interactive mode for stdio communication
docker exec -i mcp-code-validator node /app/dist/server.js