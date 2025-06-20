#!/bin/bash

# Docker MCP Server Runner with Node.js
# This script runs the MCP server using Node.js in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output to stderr
print_color() {
    printf "${2}${1}${NC}\n" >&2
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_color "❌ Docker is not running. Please start Docker first." "$RED"
    exit 1
fi

# Check if Neo4j container is running
if ! docker ps | grep -q mcp-neo4j; then
    print_color "🚀 Starting Neo4j database..." "$YELLOW"
    docker-compose -f docker-compose.yml up -d neo4j
    
    # Wait for Neo4j to be healthy
    print_color "⏳ Waiting for Neo4j to be ready..." "$YELLOW"
    while ! docker-compose -f docker-compose.yml ps | grep -q "mcp-neo4j.*healthy"; do
        sleep 2
        printf "." >&2
    done
    echo "" >&2
    print_color "✅ Neo4j is ready!" "$GREEN"
fi

# Build the MCP server image with Node.js if needed
if [[ "$(docker images -q mcp-code-validator:node 2> /dev/null)" == "" ]]; then
    print_color "🔨 Building MCP server image with Node.js..." "$YELLOW"
    docker-compose -f docker-compose.yml build mcp-server
fi

# Run the MCP server with Node.js (non-interactive for Claude Code)
print_color "🚀 Starting MCP Code Validator server with Node.js..." "$GREEN"
exec docker run --rm \
    --network mcp-code-validator_mcp-network \
    --env NEO4J_URI=neo4j://neo4j:7687 \
    --env NEO4J_USER=neo4j \
    --env NEO4J_PASSWORD=password123 \
    --env NODE_ENV=production \
    mcp-code-validator:node