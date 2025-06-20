# Docker Setup for MCP Code Validator

## 🐳 Quick Start with Docker

### 1. Start Everything with One Command

```bash
# Start Neo4j and MCP server
./docker-manage.sh start

# Check status
./docker-manage.sh status
```

### 2. Configure Claude Code to Use Docker

Add to your Claude Code configuration (`~/.config/claude-code/mcp_servers.json`):

```json
{
  "mcpServers": {
    "code-validator": {
      "command": "/Users/robert/projects/mcp-code-validator/docker-mcp.sh",
      "args": [],
      "cwd": "/Users/robert/projects/mcp-code-validator"
    }
  }
}
```

## 📦 What's Included

### Services
1. **Neo4j** - Graph database (ports 7474, 7687)
2. **MCP Server** - The validation server
3. **Nginx Proxy** (optional) - For web access

### Features
- ✅ Automatic health checks
- ✅ Persistent data volumes
- ✅ Isolated network
- ✅ Non-root user for security
- ✅ Signal handling with dumb-init
- ✅ Production-ready configuration

## 🛠️ Management Commands

```bash
# Start all services
./docker-manage.sh start

# Stop all services
./docker-manage.sh stop

# Restart services
./docker-manage.sh restart

# View logs
./docker-manage.sh logs
./docker-manage.sh logs -f  # Follow logs

# Open shell in MCP container
./docker-manage.sh shell

# Check status
./docker-manage.sh status

# Clean everything (removes data!)
./docker-manage.sh clean

# Rebuild image
./docker-manage.sh build
```

## 🔧 Development Mode

For development with hot reload:

```bash
# Use development compose file
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or modify docker-compose.yml to mount source
```

## 🌐 Access Points

- **Neo4j Browser**: http://localhost:7474
  - Username: `neo4j`
  - Password: `password123`

- **MCP Server**: Accessed via stdio (Claude Code)

## 🔍 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs mcp-server

# Check Neo4j logs
docker-compose logs neo4j
```

### Permission issues
```bash
# The container runs as non-root user (uid 1001)
# If you have permission issues with mounted volumes:
sudo chown -R 1001:1001 ./dist
```

### Port conflicts
```bash
# Check if ports are in use
lsof -i :7474
lsof -i :7687

# Change ports in docker-compose.yml if needed
```

### Clean start
```bash
# Remove everything and start fresh
./docker-manage.sh clean
./docker-manage.sh build
./docker-manage.sh start
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│   docker-mcp.sh │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  MCP Container  │
                        │  (Node.js app)  │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Neo4j Container│
                        │  (Graph DB)     │
                        └─────────────────┘
```

## 🚀 Production Deployment

For production use:

1. Change passwords in `docker-compose.yml`
2. Use environment variables for secrets
3. Enable SSL/TLS for Neo4j
4. Use Docker secrets or vault
5. Set resource limits
6. Enable monitoring

Example production override:

```yaml
# docker-compose.prod.yml
services:
  neo4j:
    environment:
      - NEO4J_AUTH=${NEO4J_AUTH}
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
  
  mcp-server:
    environment:
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1'
```

## 📊 Monitoring

View real-time stats:

```bash
# Container stats
docker stats

# Neo4j metrics
curl http://localhost:7474/db/data/

# Check health endpoints
docker inspect mcp-neo4j | grep -A 5 Health
```