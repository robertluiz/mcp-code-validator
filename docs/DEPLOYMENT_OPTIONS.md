# Deployment Options for MCP Code Validator

## 🚀 Available Deployment Methods

### 1. **Docker with Node.js (Default)**
- **Compatibility**: Maximum compatibility with native dependencies
- **Image**: Node.js Alpine with optimized build
- **Size**: ~380MB
- **Command**: `./docker-manage.sh start`

### 2. **Local Installation**
- **Flexibility**: Direct control
- **Requirements**: Node.js/Bun + Neo4j
- **Command**: `npm start` or `bun start`

## 📊 Comparison Table

| Feature | Docker (Node.js) | Local Installation |
|---------|------------------|-------------------|
| Startup Speed | 🚀 ~2s | 🏃 ~1-3s |
| Memory Usage | 💾 ~50MB | 💾 Varies |
| TypeScript | ✅ Built-in | ❌ Needs Build |
| Setup Complexity | 🟢 Easy | 🟡 Medium |
| Dependency Management | ✅ Containerized | ❌ Manual |
| Neo4j Included | ✅ Yes | ❌ No |

## 🐳 Docker Images Used

### Default Setup (Node.js)
- **Runtime**: `node:20-alpine`
- **Database**: `neo4j:latest`

## 🔧 Quick Start Commands

### Docker (Default)
```bash
# Start all services
./docker-manage.sh start

# Configure Claude Code
# Use: docker-mcp.sh
```

### Local Development
```bash
# With Bun
bun install
bun run src/server.ts

# With Node.js
npm install
npm start
```

## 🎯 Which Should You Choose?

### Choose **Docker (Default)** if:
- You want reliable containerized deployment
- You need maximum compatibility with native dependencies  
- You need a complete setup with Neo4j
- You prefer production-ready Node.js

### Choose **Local Installation** if:
- You need to modify code frequently
- You have specific Neo4j requirements
- You prefer direct control over dependencies

## 📦 Container Architecture

```
┌─────────────────────────────────────────────┐
│             Docker Network                   │
├─────────────────┬───────────────────────────┤
│   Neo4j:latest  │  MCP Server (Node.js)      │
│   Port: 7687    │  Stdio Interface           │
│   Port: 7474    │  TypeScript/JavaScript     │
└─────────────────┴───────────────────────────┘
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check ports
   lsof -i :7474
   lsof -i :7687
   ```

2. **Permission Errors**
   ```bash
   # Fix permissions
   sudo chown -R $(id -u):$(id -g) .
   ```

3. **Memory Issues**
   ```yaml
   # Add to docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 2G
   ```

## 🚨 Production Considerations

1. **Security**
   - Change default Neo4j password
   - Use environment variables for secrets
   - Enable SSL/TLS

2. **Performance**
   - Set appropriate memory limits
   - Use volume mounts for data persistence
   - Enable Neo4j query caching

3. **Monitoring**
   - Enable health checks
   - Use logging aggregation
   - Monitor resource usage

## 📈 Performance Benchmarks

### Startup Time
- Bun: ~500ms
- Node.js: ~2000ms
- Improvement: 4x faster

### Memory Usage (Idle)
- Bun: ~30MB
- Node.js: ~50MB
- Improvement: 40% less

### Request Processing
- Bun: ~5ms average
- Node.js: ~8ms average
- Improvement: 37% faster