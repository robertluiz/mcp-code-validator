# Windows Setup Guide for MCP Code Validator

This guide provides detailed instructions for running MCP Code Validator on Windows.

## Prerequisites

1. **Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Ensure WSL 2 backend is enabled (recommended)

2. **PowerShell 5.1 or newer** (comes with Windows 10/11)

3. **Git for Windows** (optional, for cloning the repository)
   - Download from: https://git-scm.com/download/win

## Installation Steps

### 1. Clone or Download the Repository

```powershell
# Using Git
git clone https://github.com/your-repo/mcp-code-validator.git
cd mcp-code-validator

# Or download and extract the ZIP file
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```powershell
# Using PowerShell
@"
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
MCP_PORT=8080
"@ | Out-File -FilePath .env -Encoding UTF8
```

### 3. Running with Docker

The project includes both PowerShell and batch scripts for Windows users.

#### Using PowerShell (Recommended)

```powershell
# Start all services
.\scripts\docker-manage.ps1 start

# View status
.\scripts\docker-manage.ps1 status

# View logs
.\scripts\docker-manage.ps1 logs

# Stop services
.\scripts\docker-manage.ps1 stop
```

#### Using Command Prompt

```cmd
REM Start all services
scripts\docker-manage.bat start

REM View status
scripts\docker-manage.bat status

REM View logs
scripts\docker-manage.bat logs

REM Stop services
scripts\docker-manage.bat stop
```

### 4. Available Commands

- `start` - Start all services (Neo4j + MCP Server)
- `stop` - Stop all services
- `restart` - Restart all services
- `logs` - Show logs (add `-f` to follow)
- `shell` - Open shell in MCP container
- `status` - Show service status
- `clean` - Remove containers and volumes
- `build` - Rebuild the MCP server image
- `dev` - Start in development mode

## Troubleshooting

### PowerShell Execution Policy

If you get an execution policy error, run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or run the script with bypass:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\docker-manage.ps1 start
```

### Docker Desktop Not Running

Ensure Docker Desktop is running before executing the scripts. You should see the Docker icon in the system tray.

### Path Issues

If you encounter path issues, ensure you're running the scripts from the project root directory:

```powershell
cd C:\path\to\mcp-code-validator
.\scripts\docker-manage.ps1 start
```

### WSL 2 Backend

For best performance, ensure Docker Desktop is using the WSL 2 backend:

1. Open Docker Desktop settings
2. Go to General
3. Enable "Use the WSL 2 based engine"

## Development Setup (Without Docker)

If you prefer to run without Docker:

### 1. Install Dependencies

```powershell
# Install Node.js from https://nodejs.org/

# Install project dependencies
npm install
```

### 2. Install and Run Neo4j

Download Neo4j Desktop from: https://neo4j.com/download/

Or use Chocolatey:

```powershell
choco install neo4j-community
```

### 3. Run the Server

```powershell
# Development mode
npm start

# Or build and run
npm run build
npm run serve
```

## Integration with Windows Terminal

For a better terminal experience, use Windows Terminal:

1. Install from Microsoft Store
2. Set PowerShell or Command Prompt as default profile
3. The colored output from the scripts will display properly

## VS Code Integration on Windows

When configuring VS Code or other editors on Windows, use Windows-style paths:

```json
{
  "mcpServers": {
    "code-validator": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-code-validator\\dist\\server.js"],
      "cwd": "C:\\path\\to\\mcp-code-validator"
    }
  }
}
```

## Common Issues on Windows

### Line Ending Issues

If you encounter issues with line endings, configure Git:

```powershell
git config --global core.autocrlf true
```

### File Permission Issues

Windows doesn't have the same permission system as Unix. The scripts handle this automatically.

### Firewall Warnings

You may see Windows Firewall warnings when Docker containers start. Allow the connections for local development.

## Getting Help

If you encounter issues specific to Windows:

1. Check Docker Desktop logs
2. Run with verbose output: `.\scripts\docker-manage.ps1 logs`
3. Open an issue with Windows-specific details