# Cursor + Docker Setup Guide for Windows

This guide explains how to configure Cursor to connect to the MCP Code Validator running in Docker on Windows.

## Prerequisites

1. **Docker Desktop** running with the MCP services:
   ```powershell
   .\scripts\docker-manage.ps1 start
   ```

2. **Cursor** installed on Windows

## Configuration Steps

### Method 1: Using Docker Container Directly (Recommended)

Since the MCP server is running inside Docker, we need to create a wrapper script that Cursor can execute.

#### Step 1: Create a Windows wrapper script

Create a new file `cursor-mcp-wrapper.ps1` in the scripts directory:

```powershell
# File: scripts/cursor-mcp-wrapper.ps1
param()

# Execute the MCP server inside the running Docker container
docker exec -i mcp-code-validator node /app/dist/server.js
```

Make it executable:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

#### Step 2: Create a batch wrapper (for better compatibility)

Create `cursor-mcp-wrapper.bat` in the scripts directory:

```batch
@echo off
REM File: scripts/cursor-mcp-wrapper.bat
docker exec -i mcp-code-validator node /app/dist/server.js
```

#### Step 3: Configure Cursor

1. Open Cursor Settings (Ctrl+,)
2. Search for "Model Context Protocol" or "MCP"
3. Click on "Edit in settings.json"
4. Add the following configuration:

```json
{
  "mcp.servers": {
    "mcp-code-validator": {
      "command": "C:\\projects\\mcp-code-validator\\scripts\\cursor-mcp-wrapper.bat",
      "args": [],
      "env": {}
    }
  }
}
```

**Note**: Replace `C:\\projects\\mcp-code-validator` with your actual project path.

### Method 2: Using Network Connection

If Cursor supports connecting to MCP servers via network, you can expose the MCP port:

#### Step 1: Modify docker-compose.yml

Add port mapping to the mcp-server service:

```yaml
services:
  mcp-server:
    ports:
      - "8080:8080"  # Expose MCP port
    environment:
      - MCP_PORT=8080
      # ... other environment variables
```

#### Step 2: Rebuild and restart

```powershell
.\scripts\docker-manage.ps1 build
.\scripts\docker-manage.ps1 restart
```

#### Step 3: Configure Cursor for network connection

```json
{
  "mcp.servers": {
    "mcp-code-validator": {
      "transport": "http",
      "url": "http://localhost:8080"
    }
  }
}
```

### Method 3: Using WSL Integration

If you have WSL 2 enabled, you can use it as a bridge:

#### Step 1: Create WSL wrapper script

Create `cursor-mcp-wsl.bat`:

```batch
@echo off
wsl -e docker exec -i mcp-code-validator node /app/dist/server.js
```

#### Step 2: Configure Cursor

```json
{
  "mcp.servers": {
    "mcp-code-validator": {
      "command": "C:\\projects\\mcp-code-validator\\scripts\\cursor-mcp-wsl.bat",
      "args": [],
      "transport": "stdio"
    }
  }
}
```

## Verification

To verify the connection is working:

1. Restart Cursor after configuration
2. Check Cursor's MCP panel or logs
3. Try using MCP tools in Cursor

### Check if container is running:
```powershell
docker ps | Select-String "mcp-code-validator"
```

### View MCP server logs:
```powershell
docker logs mcp-code-validator
```

### Test the wrapper script manually:
```powershell
.\scripts\cursor-mcp-wrapper.bat
```

You should see the MCP server's capability response.

## Troubleshooting

### Issue: "Container not found"

Make sure the Docker containers are running:
```powershell
.\scripts\docker-manage.ps1 status
```

### Issue: "Permission denied"

Run PowerShell as Administrator or ensure Docker Desktop is running with proper permissions.

### Issue: "Command not found in Cursor"

1. Use absolute paths in Cursor configuration
2. Ensure the wrapper scripts are executable
3. Try using the .bat file instead of .ps1

### Issue: "Connection timeout"

1. Check Windows Firewall settings
2. Ensure Docker Desktop is using WSL 2 backend
3. Verify the container is healthy:
   ```powershell
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```

## Alternative: Local Development Mode

If you prefer not to use Docker, you can run the MCP server locally:

1. Install Node.js and dependencies:
   ```powershell
   npm install
   npm run build
   ```

2. Configure Cursor:
   ```json
   {
     "mcp.servers": {
       "mcp-code-validator": {
         "command": "node",
         "args": ["C:\\projects\\mcp-code-validator\\dist\\server.js"],
         "transport": "stdio"
       }
     }
   }
   ```

## Best Practices

1. **Keep Docker running**: Ensure Docker Desktop starts with Windows
2. **Use absolute paths**: Avoid relative paths in Cursor configuration
3. **Check logs regularly**: Monitor both Docker and Cursor logs for issues
4. **Update regularly**: Keep both Cursor and Docker Desktop updated

## Example Usage in Cursor

Once configured, you can use the MCP tools in Cursor:

1. Open a code file
2. Use Cursor's AI features
3. The MCP tools will be available for:
   - Code validation
   - Hallucination detection
   - Quality analysis
   - Code indexing

The AI will automatically use these tools to provide better code suggestions and validations based on your Neo4j knowledge graph.