# Branch-Based Context Management

The MCP Code Validator supports branch-specific indexing and validation, allowing you to maintain separate knowledge graphs for different git branches. This prevents conflicts between code in different development stages.

## Overview

Each indexed element (functions, classes, components) is stored with a context that includes both project and branch information:

- **Format**: `{projectContext}:{branch}`
- **Example**: `my-app:main`, `backend-api:feature/auth`, `frontend:develop`

## Benefits

1. **Isolated Development**: Changes in feature branches don't affect main branch validation
2. **Branch Comparison**: Compare code differences between branches
3. **Context Switching**: Validate against specific branch contexts
4. **Clean Merging**: Understand code changes before merging

## Usage Examples

### 1. Indexing Code by Branch

#### Index files for main branch:
```javascript
await mcp.callTool('indexFile', {
  filePath: 'src/auth/login.ts',
  content: 'export function login(user, pass) { ... }',
  language: 'typescript',
  projectContext: 'my-app',
  branch: 'main'
});
```

#### Index the same file in a feature branch:
```javascript
await mcp.callTool('indexFile', {
  filePath: 'src/auth/login.ts',
  content: 'export function login(credentials) { ... }', // Different implementation
  language: 'typescript',
  projectContext: 'my-app',
  branch: 'feature/oauth'
});
```

### 2. Validating Against Specific Branches

#### Validate new code against main branch:
```javascript
await mcp.callTool('validateCode', {
  code: 'function login(user, pass) { return authenticateUser(user, pass); }',
  language: 'typescript',
  projectContext: 'my-app',
  branch: 'main'
});
```

#### Validate against feature branch:
```javascript
await mcp.callTool('validateCode', {
  code: 'function login(credentials) { return oauthLogin(credentials); }',
  language: 'typescript',
  projectContext: 'my-app',
  branch: 'feature/oauth'
});
```

### 3. Branch Management Operations

#### List all contexts and branches:
```javascript
await mcp.callTool('manageContexts', {
  action: 'list'
});
// Output: my-app (main), my-app (feature/oauth), backend (develop)
```

#### List branches for a specific project:
```javascript
await mcp.callTool('manageContexts', {
  action: 'list-branches',
  projectContext: 'my-app'
});
// Output: main, feature/oauth, develop, feature/payments
```

#### Create a new branch context:
```javascript
await mcp.callTool('manageContexts', {
  action: 'create',
  projectContext: 'my-app',
  branch: 'feature/new-ui'
});
```

#### Compare two branches:
```javascript
await mcp.callTool('manageContexts', {
  action: 'compare-branches',
  projectContext: 'my-app',
  branch: 'feature/oauth',
  targetBranch: 'main'
});
```

### 4. Workflow Examples

#### Feature Development Workflow:

1. **Start feature development**:
```javascript
// Create branch context
await mcp.callTool('manageContexts', {
  action: 'create',
  projectContext: 'my-app',
  branch: 'feature/user-profiles'
});

// Index existing files in the new branch
await mcp.callTool('indexFile', {
  filePath: 'src/user/profile.ts',
  content: '/* existing code */',
  language: 'typescript',
  projectContext: 'my-app',
  branch: 'feature/user-profiles'
});
```

2. **Develop and validate**:
```javascript
// As you write new code, validate against the feature branch
await mcp.callTool('validateCode', {
  code: 'function updateProfile(data) { ... }',
  language: 'typescript',
  projectContext: 'my-app',
  branch: 'feature/user-profiles'
});
```

3. **Before merging**:
```javascript
// Compare changes with main branch
await mcp.callTool('manageContexts', {
  action: 'compare-branches',
  projectContext: 'my-app',
  branch: 'feature/user-profiles',
  targetBranch: 'main'
});

// Validate file changes against main
await mcp.callTool('validateFile', {
  filePath: 'src/user/profile.ts',
  content: '/* updated code */',
  language: 'typescript',
  projectContext: 'my-app',
  branch: 'main'  // Validate against main to check conflicts
});
```

#### Multi-Environment Setup:

```javascript
// Frontend development
await mcp.callTool('indexFile', {
  filePath: 'components/Button.tsx',
  content: '/* component code */',
  language: 'typescript',
  projectContext: 'frontend',
  branch: 'develop'
});

// Backend API
await mcp.callTool('indexFile', {
  filePath: 'api/users.js',
  content: '/* API code */',
  language: 'javascript',
  projectContext: 'backend',
  branch: 'develop'
});

// Mobile app
await mcp.callTool('indexFile', {
  filePath: 'screens/Profile.tsx',
  content: '/* mobile code */',
  language: 'typescript',
  projectContext: 'mobile',
  branch: 'feature/redesign'
});
```

## Branch Comparison Output

When comparing branches, you'll get detailed information:

```
Branch Comparison: feature/oauth vs main

📊 Summary:
  • 15 elements in feature/oauth
  • 12 elements in main
  • 10 common elements
  • 5 only in feature/oauth
  • 2 only in main

🔴 Only in feature/oauth:
  • Function: oauthLogin
  • Function: refreshToken
  • Class: OAuthProvider
  • Function: validateToken
  • Function: revokeToken

🔵 Only in main:
  • Function: simpleLogin
  • Function: basicAuth

✅ Common elements:
  • Function: login
  • Function: logout
  • Class: User
  • ...
```

## Best Practices

### 1. Naming Conventions
- Use consistent project context names: `frontend`, `backend`, `mobile`
- Use git branch names directly: `main`, `develop`, `feature/auth`, `hotfix/security`

### 2. Context Management
- Clean up old feature branch contexts after merging
- Regularly compare feature branches with main
- Index dependencies separately for each major branch

### 3. Development Workflow
- Always specify branch when indexing/validating
- Use branch comparison before code reviews
- Validate against target branch before merging

### 4. Team Coordination
- Establish team conventions for project context names
- Document active branches and their purposes
- Use branch comparison to understand teammate changes

## Advanced Features

### Dependency Indexing by Branch
```javascript
await mcp.callTool('indexDependencies', {
  packageJsonContent: JSON.stringify(packageJson),
  projectPath: '/path/to/project',
  projectContext: 'my-app',
  branch: 'feature/new-deps'  // Index deps for specific branch
});
```

### Quality Analysis by Branch
```javascript
await mcp.callTool('validateCodeQuality', {
  code: 'function complexFunction() { ... }',
  language: 'typescript',
  projectContext: 'my-app',
  branch: 'feature/refactor'  // Check quality in context of branch
});
```

## Database Schema

Each node in Neo4j includes a context property:

```cypher
// Functions
CREATE (f:Function {
  name: "login",
  context: "my-app:main",
  language: "typescript",
  body: "...",
  createdAt: timestamp()
})

// Files  
CREATE (file:File {
  path: "src/auth/login.ts",
  context: "my-app:main"
})

// Relationships
CREATE (file)-[:CONTAINS]->(f)
```

## Migration from Single Context

If you have existing data without branch context, it will be treated as `{context}:main`. You can migrate by:

1. Listing existing contexts
2. Re-indexing files with explicit branch parameters
3. Cleaning up old single-context data

This branch-based approach ensures clean separation of code contexts and enables powerful comparison and validation features across your development workflow.