#!/bin/bash

# Docker Management Script for MCP Code Validator with Bun

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="../docker/docker-compose.yml"
PROJECT_NAME="mcp-code-validator-bun"

# Function to print colored output
print_color() {
    printf "${2}${1}${NC}\n"
}

# Function to show usage
usage() {
    echo "Usage: $0 {start|stop|restart|logs|shell|status|clean|build|dev}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all services with Bun"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  logs    - Show logs (use -f for follow)"
    echo "  shell   - Open shell in MCP container"
    echo "  status  - Show status of all services"
    echo "  clean   - Remove all containers and volumes"
    echo "  build   - Build/rebuild the MCP server image with Bun"
    echo "  dev     - Start in development mode with hot reload"
    exit 1
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_color "❌ Docker is not running. Please start Docker first." "$RED"
        exit 1
    fi
}

# Start services
start_services() {
    print_color "🚀 Starting MCP Code Validator services with Bun..." "$GREEN"
    docker-compose -f $COMPOSE_FILE up -d
    
    print_color "⏳ Waiting for services to be ready..." "$YELLOW"
    sleep 5
    
    # Wait for Neo4j to be healthy
    while ! docker-compose -f $COMPOSE_FILE ps | grep -q "mcp-neo4j.*healthy"; do
        printf "."
        sleep 2
    done
    echo ""
    
    print_color "✅ All services are running!" "$GREEN"
    show_status
}

# Stop services
stop_services() {
    print_color "🛑 Stopping MCP Code Validator services..." "$YELLOW"
    docker-compose -f $COMPOSE_FILE down
    print_color "✅ Services stopped." "$GREEN"
}

# Restart services
restart_services() {
    stop_services
    sleep 2
    start_services
}

# Show logs
show_logs() {
    if [[ "$1" == "-f" ]]; then
        docker-compose -f $COMPOSE_FILE logs -f
    else
        docker-compose -f $COMPOSE_FILE logs --tail=100
    fi
}

# Open shell in container
open_shell() {
    print_color "🐚 Opening shell in MCP Bun container..." "$BLUE"
    docker-compose -f $COMPOSE_FILE exec mcp-server sh
}

# Show status
show_status() {
    print_color "📊 Service Status:" "$BLUE"
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    print_color "🔍 Service Health:" "$BLUE"
    docker-compose -f $COMPOSE_FILE ps | grep -E "(NAME|health)" || true
    echo ""
    print_color "🌐 Access URLs:" "$BLUE"
    echo "  Neo4j Browser: http://localhost:7474"
    echo "  Neo4j Bolt:    bolt://localhost:7687"
    echo "  Credentials:   neo4j/password123"
}

# Clean everything
clean_all() {
    print_color "🧹 Cleaning up Docker resources..." "$YELLOW"
    docker-compose -f $COMPOSE_FILE down -v
    docker rmi mcp-code-validator:bun 2>/dev/null || true
    print_color "✅ Cleanup complete." "$GREEN"
}

# Build image
build_image() {
    print_color "🔨 Building MCP server image with Bun..." "$YELLOW"
    docker-compose -f $COMPOSE_FILE build --no-cache mcp-server
    print_color "✅ Build complete." "$GREEN"
}

# Development mode
dev_mode() {
    print_color "🔧 Starting in development mode with Bun..." "$YELLOW"
    
    # Create a dev override file
    cat > docker-compose.bun.dev.yml << EOF
version: '3.8'

services:
  mcp-server:
    volumes:
      - ./src:/app/src
      - ./dist:/app/dist
      - ./package.json:/app/package.json
      - ./tsconfig.json:/app/tsconfig.json
      - ./bun.lockb:/app/bun.lockb
    environment:
      - BUN_ENV=development
      - NODE_ENV=development
    command: ["bun", "run", "start"]
EOF
    
    docker-compose -f $COMPOSE_FILE -f docker-compose.bun.dev.yml up
}

# Main script
check_docker

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs "$2"
        ;;
    shell)
        open_shell
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    build)
        build_image
        ;;
    dev)
        dev_mode
        ;;
    *)
        usage
        ;;
esac