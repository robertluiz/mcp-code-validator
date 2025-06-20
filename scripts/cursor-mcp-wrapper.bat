@echo off
REM MCP Wrapper Script for Cursor on Windows (Batch version)
REM This script allows Cursor to communicate with the MCP server running in Docker

REM Check if container is running
docker ps --format "{{.Names}}" | find "mcp-code-validator" >nul
if errorlevel 1 (
    echo Error: MCP container is not running. Please start it with: .\scripts\docker-manage.ps1 start
    exit /b 1
)

REM Execute the MCP server inside the running Docker container
docker exec -i mcp-code-validator node /app/dist/server.js