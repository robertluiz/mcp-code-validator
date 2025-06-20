# Docker Management Script for MCP Code Validator with Bun (PowerShell Version)
# Usage: .\docker-manage.ps1 [command]

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Param = ""
)

# Get script directory and determine paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

# Configuration - adjust path based on where script is run from
if (Test-Path "$ScriptDir/../docker/docker-compose.yml") {
    # Running from scripts directory
    $COMPOSE_FILE = "$ScriptDir/../docker/docker-compose.yml"
} elseif (Test-Path "docker/docker-compose.yml") {
    # Running from root directory
    $COMPOSE_FILE = "docker/docker-compose.yml"
} else {
    Write-Host "Error: docker-compose.yml not found. Please run from project root or scripts directory." -ForegroundColor Red
    exit 1
}

$PROJECT_NAME = "mcp-code-validator-bun"

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    $args | Write-Output
    $host.UI.RawUI.ForegroundColor = $fc
}

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\docker-manage.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start   - Start all services with Bun"
    Write-Host "  stop    - Stop all services"
    Write-Host "  restart - Restart all services"
    Write-Host "  logs    - Show logs (add -f for follow)"
    Write-Host "  shell   - Open shell in MCP container"
    Write-Host "  status  - Show status of all services"
    Write-Host "  clean   - Remove all containers and volumes"
    Write-Host "  build   - Build/rebuild the MCP server image with Bun"
    Write-Host "  dev     - Start in development mode with hot reload"
    exit 1
}

# Check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
    }
    catch {
        Write-ColorOutput Red "❌ Docker is not running. Please start Docker Desktop first."
        exit 1
    }
}

# Start services
function Start-Services {
    Write-ColorOutput Green "🚀 Starting MCP Code Validator services with Bun..."
    docker-compose -f $COMPOSE_FILE up -d
    
    Write-ColorOutput Yellow "⏳ Waiting for services to be ready..."
    Start-Sleep -Seconds 5
    
    # Wait for Neo4j to be healthy
    while (-not (docker-compose -f $COMPOSE_FILE ps | Select-String "mcp-neo4j.*healthy")) {
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 2
    }
    Write-Host ""
    
    Write-ColorOutput Green "✅ All services are running!"
    Show-Status
}

# Stop services
function Stop-Services {
    Write-ColorOutput Yellow "🛑 Stopping MCP Code Validator services..."
    docker-compose -f $COMPOSE_FILE down
    Write-ColorOutput Green "✅ Services stopped."
}

# Restart services
function Restart-Services {
    Stop-Services
    Start-Sleep -Seconds 2
    Start-Services
}

# Show logs
function Show-Logs {
    if ($Param -eq "-f") {
        docker-compose -f $COMPOSE_FILE logs -f
    }
    else {
        docker-compose -f $COMPOSE_FILE logs --tail=100
    }
}

# Open shell in container
function Open-Shell {
    Write-ColorOutput Blue "🐚 Opening shell in MCP Bun container..."
    docker-compose -f $COMPOSE_FILE exec mcp-server sh
}

# Show status
function Show-Status {
    Write-ColorOutput Blue "📊 Service Status:"
    docker-compose -f $COMPOSE_FILE ps
    Write-Host ""
    Write-ColorOutput Blue "🔍 Service Health:"
    docker-compose -f $COMPOSE_FILE ps | Select-String "(NAME|health)"
    Write-Host ""
    Write-ColorOutput Blue "🌐 Access URLs:"
    Write-Host "  Neo4j Browser: http://localhost:7474"
    Write-Host "  Neo4j Bolt:    bolt://localhost:7687"
    Write-Host "  Credentials:   neo4j/password123"
}

# Clean everything
function Clean-All {
    Write-ColorOutput Yellow "🧹 Cleaning up Docker resources..."
    docker-compose -f $COMPOSE_FILE down -v
    docker rmi mcp-code-validator:bun 2>$null
    Write-ColorOutput Green "✅ Cleanup complete."
}

# Build image
function Build-Image {
    Write-ColorOutput Yellow "🔨 Building MCP server image with Bun..."
    docker-compose -f $COMPOSE_FILE build --no-cache mcp-server
    Write-ColorOutput Green "✅ Build complete."
}

# Development mode
function Start-DevMode {
    Write-ColorOutput Yellow "🔧 Starting in development mode with Bun..."
    
    # Determine volume paths based on current location
    if ($COMPOSE_FILE -like "*scripts*") {
        # Running from scripts directory
        $srcPath = "../src"
        $distPath = "../dist"
        $packagePath = "../package.json"
        $tsconfigPath = "../tsconfig.json"
        $bunlockPath = "../bun.lockb"
    } else {
        # Running from root directory
        $srcPath = "./src"
        $distPath = "./dist"
        $packagePath = "./package.json"
        $tsconfigPath = "./tsconfig.json"
        $bunlockPath = "./bun.lockb"
    }
    
    # Create a dev override file
    $devComposeContent = @"
version: '3.8'

services:
  mcp-server:
    volumes:
      - $srcPath:/app/src
      - $distPath:/app/dist
      - $packagePath:/app/package.json
      - $tsconfigPath:/app/tsconfig.json
      - $bunlockPath:/app/bun.lockb
    environment:
      - BUN_ENV=development
      - NODE_ENV=development
    command: ["bun", "run", "start"]
"@
    
    $devComposeContent | Out-File -FilePath "docker-compose.bun.dev.yml" -Encoding UTF8
    
    docker-compose -f $COMPOSE_FILE -f docker-compose.bun.dev.yml up
}

# Main script
Test-Docker

switch ($Command) {
    "start" {
        Start-Services
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Restart-Services
    }
    "logs" {
        Show-Logs
    }
    "shell" {
        Open-Shell
    }
    "status" {
        Show-Status
    }
    "clean" {
        Clean-All
    }
    "build" {
        Build-Image
    }
    "dev" {
        Start-DevMode
    }
    default {
        Show-Usage
    }
}