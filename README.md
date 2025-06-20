# MCP Code Validator

An advanced Model Context Protocol (MCP) server that indexes and validates TypeScript/JavaScript code using AST parsing and Neo4j graph database. This tool helps prevent AI code hallucinations and maintain code quality by building a knowledge graph of your codebase.

## Features

- **AI Hallucination Detection**: Prevents AI agents from generating non-existent APIs and impossible code patterns
- **Code Quality Analysis**: Comprehensive quality scoring with A-F grades and actionable recommendations
- **Context-Aware Validation**: Validates code against your actual codebase patterns and conventions
- **AST-based Parsing**: Uses tree-sitter for accurate TypeScript/JavaScript code analysis
- **Neo4j Integration**: Stores code structure in a graph database for intelligent pattern matching
- **MCP Protocol**: Seamlessly integrates with Claude Code, Cursor, Windsurf, and other MCP-compatible tools

## 🐳 Quick Start with Docker

### Linux/macOS:
```bash
# Start everything with one command
./scripts/docker-manage.sh start

# Configure Claude Code (see docs/DOCKER_SETUP.md for details)
```

### Windows:
```powershell
# Using PowerShell
.\scripts\docker-manage.ps1 start

# Or using Command Prompt
scripts\docker-manage.bat start

# Configure Claude Code (see docs/DOCKER_SETUP.md for details)
```

## Core Indexing & Validation Tools

### 1. `indexFile`
Parses and indexes entire source code files, storing functions and classes with file relationships.

**Parameters:**
- `filePath`: Path of the file being indexed
- `content`: Full source code content
- `language`: Programming language (e.g., "typescript")

### 2. `indexFunctions`

Indexes individual functions without requiring full file context.

**Parameters:**
- `functions`: Array of function objects with `name`, `body`, and optional `filePath`
- `language`: Programming language

### 3. `validateCode`
Validates code snippets by checking if functions/classes already exist in the knowledge graph.

**Parameters:**
- `code`: Source code snippet to validate
- `language`: Programming language

### 4. `validateFile`
Comprehensive file validation that compares entire files against the knowledge graph.

**Parameters:**
- `filePath`: File path to validate
- `content`: File content to validate
- `language`: Programming language

**Returns detailed analysis:**
- File existence status
- Element-by-element comparison (MATCH/MODIFIED/NEW)
- Summary statistics

### 5. `indexDependencies`
**NEW**: Indexes known APIs and functions from package.json dependencies to improve validation accuracy.

**Parameters:**
- `packageJsonContent`: Content of package.json file
- `projectPath`: Optional project path for context

**Features:**
- Indexes APIs from 20+ popular libraries (React, Next.js, Express, Lodash, etc.)
- Creates library nodes and API relationships in Neo4j
- Supports React hooks, Next.js patterns, utility functions
- Distinguishes between functions, classes, constants, types, and hooks

**Supported Libraries:**
- **Frontend**: React, Next.js, styled-components, @emotion/react
- **Utilities**: Lodash, Axios, Moment, Date-fns, UUID
- **Backend**: Express, Node.js built-ins (fs, path, crypto)
- **Development**: TypeScript, Zod
- Change detection

## AI Assistance & Quality Control Tools

### 5. `detectHallucinations`
Analyzes code to detect potential AI hallucinations by checking for non-existent APIs and impossible patterns.

**Parameters:**
- `code`: Code to analyze for hallucinations
- `language`: Programming language
- `context`: Optional context with available libraries, project APIs, and allowed patterns

**Detects:**
- Non-existent functions not in knowledge graph
- Impossible imports/requires
- Common hallucinated package names
- Inconsistent API usage

### 6. `validateCodeQuality`
Comprehensive code quality analysis with scoring system (0-100, A-F grades).

**Parameters:**
- `code`: Code to analyze for quality issues
- `language`: Programming language
- `checkTypes`: Types of checks (`naming`, `structure`, `complexity`, `patterns`, `security`)

**Analyzes:**
- Naming conventions consistency
- Function length and complexity
- Anti-patterns and security issues
- Generates quality score and recommendations

### 7. `suggestImprovements`
Context-aware suggestions based on existing codebase patterns.

**Parameters:**
- `code`: Code to analyze for improvements
- `language`: Programming language
- `focusAreas`: Areas to focus on (`performance`, `readability`, `maintainability`, `consistency`)

**Provides:**
- Performance optimization suggestions
- Consistency improvements based on codebase patterns
- Readability enhancements
- Maintainability recommendations

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file with your Neo4j connection details:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
MCP_PORT=8080
```

## Integration with AI Coding Tools

This MCP server seamlessly integrates with popular AI coding assistants to prevent hallucinations and improve code quality.

### Claude Code Integration

1. **Start the MCP server:**
   ```bash
   npm start
   ```

2. **Configure Claude Code to use the MCP server:**
   
   Create or update your Claude Code configuration file:
   ```json
   {
     "mcpServers": {
       "code-validator": {
         "command": "node",
         "args": ["dist/server.js"],
         "cwd": "/path/to/mcp-code-validator"
       }
     }
   }
   ```

3. **Use in Claude Code:**
   - The tools will be automatically available in Claude Code
   - Claude can validate code against your knowledge graph
   - Detect hallucinations in real-time
   - Get quality suggestions based on your codebase

### Cursor Integration

1. **Install as MCP server:**
   ```bash
   npm run build
   ```

2. **Configure Cursor settings:**
   
   Add to your Cursor settings (`.cursor/settings.json`):
   ```json
   {
     "mcp.servers": {
       "code-validator": {
         "path": "/path/to/mcp-code-validator/dist/server.js",
         "transport": "stdio"
       }
     }
   }
   ```

3. **Usage in Cursor:**
   - Access tools via the MCP interface
   - Validate code before committing
   - Get real-time hallucination detection
   - Receive quality improvement suggestions

### Windsurf Integration

1. **Setup MCP server:**
   ```bash
   npm start
   ```

2. **Configure Windsurf:**
   
   Add to your Windsurf configuration:
   ```yaml
   mcp_servers:
     code_validator:
       command: ["node", "dist/server.js"]
       working_directory: "/path/to/mcp-code-validator"
       transport: "stdio"
   ```

3. **Features in Windsurf:**
   - Automatic code validation during development
   - Hallucination prevention in AI suggestions
   - Code quality scoring and improvements
   - Pattern-based consistency checking

### Other MCP-Compatible Tools

This server works with any tool that supports the Model Context Protocol:

- **Continue.dev**: Add as MCP server in configuration
- **Aider**: Use with `--mcp` flag
- **Custom integrations**: Use the stdio transport interface

## Usage

### Development Mode

```bash
npm start
```

### Production Build

```bash
npm run build
npm run serve
```

## Architecture

The server is built with a modular architecture:

- **`server.ts`** - Main MCP server with tool handlers
- **`parser.ts`** - AST parsing logic using tree-sitter
- **`neo4j.ts`** - Database connection management

## Neo4j Schema

The knowledge graph uses the following structure:

- **File** nodes with `path` property
- **Function** nodes with `name`, `language`, `body`, and timestamp properties
- **Class** nodes with `name`, `language`, `body`, and timestamp properties
- **`CONTAINS`** relationships linking files to their functions/classes

## Example Usage Workflows

### Initial Setup: Index Dependencies

**IMPORTANT**: Before indexing your code, first index your project dependencies to improve validation accuracy:

```typescript
// Step 1: Index your package.json dependencies
await mcp.callTool('indexDependencies', {
  packageJsonContent: JSON.stringify({
    "dependencies": {
      "react": "^18.2.0",
      "next": "^13.4.0",
      "lodash": "^4.17.21",
      "axios": "^1.4.0"
    },
    "devDependencies": {
      "typescript": "^5.0.0",
      "@types/react": "^18.0.0"
    }
  }),
  projectPath: "/path/to/your/project"
});
```

This will index known APIs from popular libraries, allowing the system to:
- ✅ Recognize `useState`, `useEffect` as valid React hooks
- ✅ Validate `axios.get()`, `lodash.map()` as real library functions
- ❌ Detect `useAutoState`, `magic-sdk` as hallucinated APIs

### Codebase Indexing

After indexing dependencies, index your existing codebase:

```typescript
// Step 2: Index individual files
await mcp.callTool('indexFile', {
  filePath: 'src/utils/helpers.ts',
  content: 'export function add(a: number, b: number) { return a + b; }',
  language: 'typescript'
});

// Or index functions directly
await mcp.callTool('indexFunctions', {
  functions: [
    { name: 'calculateTotal', body: '...', filePath: 'src/math.ts' },
    { name: 'formatCurrency', body: '...', filePath: 'src/format.ts' }
  ],
  language: 'typescript'
});
```

### Real-time AI Code Validation

During development, validate AI-generated code:

```typescript
// Detect potential hallucinations
await mcp.callTool('detectHallucinations', {
  code: `
    import { magicValidator } from 'auto-utils';
    function processData() {
      return fetchApiData().validate();
    }
  `,
  language: 'typescript',
  context: {
    availableLibraries: ['lodash', 'axios', 'zod'],
    projectApis: ['getUserData', 'saveUser']
  }
});

// Validate code quality
await mcp.callTool('validateCodeQuality', {
  code: 'function veryLongFunction() { /* 100+ lines */ }',
  language: 'typescript',
  checkTypes: ['naming', 'structure', 'security']
});
```

### Code Improvement Suggestions

Get context-aware suggestions based on your codebase:

```typescript
// Get improvement suggestions
await mcp.callTool('suggestImprovements', {
  code: `
    function getData(url, headers, timeout, retries) {
      const data = fetch(url);
      return data;
    }
  `,
  language: 'typescript',
  focusAreas: ['performance', 'consistency', 'readability']
});
```

### File-level Validation

Compare entire files against your knowledge graph:

```typescript
// Validate complete file changes
await mcp.callTool('validateFile', {
  filePath: 'src/services/api.ts',
  content: '/* entire file content */',
  language: 'typescript'
});
```

## Requirements

- Node.js 16+
- Neo4j database instance
- TypeScript support

## License

ISC

## Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Test individual components (parser, neo4j, server tools)
- **Integration Tests**: Test complete workflows and tool combinations
- **Mocked Dependencies**: Neo4j and external dependencies are mocked for reliable testing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Ensure build passes: `npm run build`
6. Submit a pull request

## Troubleshooting

### Common Issues

1. **Neo4j Connection Failed**: Verify your `.env` configuration and ensure Neo4j is running
2. **Parse Errors**: Check that the code language matches the specified language parameter
3. **Build Errors**: Ensure all dependencies are installed with `npm install`

### Debugging

Enable verbose logging by setting the environment variable:

```bash
DEBUG=mcp-code-validator npm start
```
