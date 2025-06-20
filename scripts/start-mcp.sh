#!/bin/bash

# MCP Code Validator Startup Script
# This script ensures proper environment setup before starting the MCP server

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with your Neo4j configuration:"
    echo ""
    echo "NEO4J_URI=neo4j://localhost:7687"
    echo "NEO4J_USER=neo4j"
    echo "NEO4J_PASSWORD=your_password"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if dist/server.js exists
if [ ! -f "dist/server.js" ]; then
    echo "🔨 Building project..."
    npm run build
fi

# Verify Neo4j is accessible (optional check)
echo "🔍 Checking Neo4j connection..."
if command -v nc >/dev/null 2>&1; then
    if ! nc -z localhost 7687 2>/dev/null; then
        echo "⚠️  Warning: Cannot connect to Neo4j at localhost:7687"
        echo "Make sure Neo4j is running with: docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest"
    fi
fi

# Start the MCP server
echo "🚀 Starting MCP Code Validator..."
exec node dist/server.js