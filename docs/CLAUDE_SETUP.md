# Claude Code Setup Instructions

## Quick Setup

### 1. Configure Claude Code MCP

Create or edit your Claude Code configuration file:

**macOS/Linux:** `~/.config/claude-code/mcp_servers.json`
**Windows:** `%APPDATA%\claude-code\mcp_servers.json`

```json
{
  "mcpServers": {
    "code-validator": {
      "command": "/Users/robert/projects/mcp-code-validator/start-mcp.sh",
      "args": [],
      "cwd": "/Users/robert/projects/mcp-code-validator",
      "env": {}
    }
  }
}
```

### 2. Alternative Configuration (using node directly)

If the shell script doesn't work, try:

```json
{
  "mcpServers": {
    "code-validator": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/Users/robert/projects/mcp-code-validator",
      "env": {
        "NEO4J_URI": "neo4j://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "password123"
      }
    }
  }
}
```

### 3. Test the Configuration

1. **Start Neo4j** (if not already running):
   ```bash
   docker run -d -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/password123 \
     --name neo4j-mcp \
     neo4j:latest
   ```

2. **Test MCP server manually**:
   ```bash
   cd /Users/robert/projects/mcp-code-validator
   ./start-mcp.sh
   ```
   
   You should see:
   ```
   🔧 Initializing MCP Code Validator...
   ✅ Neo4j connection verified
   🚀 Starting MCP server...
   ✅ MCP Code Validator server started successfully
   🎯 Server ready for connections...
   ```

3. **Restart Claude Code** after configuration changes

## Troubleshooting

### Error: "Connection closed"
- **Cause**: Neo4j not running or wrong credentials
- **Fix**: Start Neo4j and verify connection in `.env`

### Error: "Command not found"
- **Cause**: Wrong path in configuration
- **Fix**: Use absolute paths in the configuration

### Error: "Permission denied"
- **Cause**: Script not executable
- **Fix**: Run `chmod +x start-mcp.sh`

### Debug Mode

To see detailed logs, run manually:
```bash
cd /Users/robert/projects/mcp-code-validator
DEBUG=1 node dist/server.js
```

## Available Tools

Once connected, you'll have access to:

1. **indexDependencies** - Index package.json libraries
2. **indexFile** - Index source code files  
3. **validateCode** - Validate code against knowledge graph
4. **detectHallucinations** - Detect AI hallucinations
5. **validateCodeQuality** - Code quality analysis
6. **suggestImprovements** - Get improvement suggestions
7. **validateReactHooks** - React hooks validation

## First Steps

1. Index your dependencies:
   ```typescript
   // Use the indexDependencies tool with your package.json content
   ```

2. Index your codebase:
   ```typescript
   // Use indexFile tool to build knowledge graph
   ```

3. Start validating:
   ```typescript
   // Use detectHallucinations to prevent AI errors
   ```