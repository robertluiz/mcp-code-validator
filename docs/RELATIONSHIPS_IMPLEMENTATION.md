# Code Relationships Implementation

## Overview

The MCP Code Validator now includes comprehensive relationship tracking between code elements, creating a rich knowledge graph that captures the interconnections within codebases.

## Implemented Relationships

### 1. File-Level Relationships

#### Import Dependencies (`IMPORTS`)
```cypher
(File)-[:IMPORTS {imports: [string]}]->(Module)
```
- Tracks which modules are imported by each file
- Stores the specific imports (named imports, default imports)
- Supports both ES6 imports and CommonJS requires

#### Export Definitions (`EXPORTS`)
```cypher
(File)-[:EXPORTS]->(ExportedItem)
```
- Tracks what each file exports (functions, classes, constants)
- Distinguishes between named exports and default exports
- Links exported items to their definitions

### 2. Function-Level Relationships

#### Function Calls (`CALLS`)
```cypher
(Function)-[:CALLS]->(Function)
```
- Tracks which functions call other functions
- Uses pattern matching to identify function invocations
- Filters out built-in functions and keywords

#### Class Instantiation (`INSTANTIATES`)
```cypher
(Function)-[:INSTANTIATES]->(Class)
```
- Tracks when functions create instances of classes
- Identifies `new ClassName()` patterns
- Links functions to the classes they instantiate

### 3. Class-Level Relationships

#### Inheritance (`EXTENDS`)
```cypher
(Class)-[:EXTENDS]->(Class)
```
- Tracks class inheritance hierarchies
- Identifies `class Child extends Parent` patterns
- Captures full inheritance chains

#### Interface Implementation (`IMPLEMENTS`)
```cypher
(Class)-[:IMPLEMENTS]->(Interface)
```
- Tracks interface implementations
- Supports multiple interface implementations
- Creates interface nodes for referenced interfaces

### 4. Container Relationships

#### File Contents (`CONTAINS`)
```cypher
(File)-[:CONTAINS]->(Function|Class|ReactComponent)
```
- Links files to their contained code elements
- Maintains file-to-element ownership

#### React Hook Usage (`USES`)
```cypher
(File)-[:USES]->(ReactHook)
```
- Tracks React hook usage within files
- Links components to their hook dependencies

#### Styling Relationships (`STYLES`)
```cypher
(File)-[:STYLES]->(FrontendElement)
```
- Links files to their CSS-in-JS and styled components
- Tracks styling dependencies

## New Tools

### `analyzeRelationships`
Comprehensive relationship analysis tool with the following features:

#### Parameters:
- `projectContext`: Project namespace (default: "default")
- `branch`: Git branch (default: "main")
- `analysisType`: Type of analysis ("all", "function-calls", "class-inheritance", "imports", "dependencies")
- `elementName`: Specific element to analyze (optional)
- `maxDepth`: Relationship traversal depth (1-5, default: 2)

#### Analysis Types:
1. **All Relationships** (`"all"`): Complete relationship analysis
2. **Function Calls** (`"function-calls"`): Function call dependencies
3. **Class Inheritance** (`"class-inheritance"`): Class hierarchies and interface implementations
4. **Imports** (`"imports"`): Module dependency analysis
5. **Dependencies** (`"dependencies"`): Instantiation and usage patterns

#### Output:
- Relationship summary with counts by type
- Detailed relationship listing
- Orphaned elements detection
- Node type statistics

## Enhanced Parser Capabilities

### Improved Import Parsing
- Combines AST parsing with regex fallbacks
- Handles complex import patterns:
  ```typescript
  import React from 'react';                    // Default import
  import { useState, useEffect } from 'react';  // Named imports
  import { User as UserType } from './types';   // Aliased imports
  ```

### Enhanced Export Detection
- Detects all export patterns:
  ```typescript
  export function myFunction() {}               // Named function export
  export class MyClass {}                       // Named class export
  export { item1, item2 };                     // Named exports
  export default function App() {}             // Default function export
  ```

### Accurate Class Parsing
- Captures full class declarations including inheritance:
  ```typescript
  class Child extends Parent implements Interface {}
  ```
- Preserves inheritance and implementation information

### Function Filtering
- Excludes constructors from function counts
- Distinguishes between methods and standalone functions
- Maintains accurate function relationship tracking

## Neo4j Schema Updates

### New Node Types
- `Module`: External modules and dependencies
- `ExportedItem`: Exported functions, classes, and variables
- `Interface`: TypeScript/JavaScript interfaces

### Enhanced Properties
- Import relationships include `imports` array property
- Export items include `type` property ("default" or "named")
- All nodes maintain `context` property for branch isolation

## Usage Examples

### Index a File with Relationships
```javascript
await client.callTool('indexFile', {
    filePath: 'src/services/userService.ts',
    content: sourceCode,
    language: 'typescript',
    projectContext: 'my-app',
    branch: 'main'
});
```

### Analyze All Relationships
```javascript
await client.callTool('analyzeRelationships', {
    projectContext: 'my-app',
    branch: 'main',
    analysisType: 'all'
});
```

### Analyze Specific Element
```javascript
await client.callTool('analyzeRelationships', {
    projectContext: 'my-app',
    branch: 'main',
    elementName: 'UserService',
    analysisType: 'function-calls'
});
```

## Benefits

1. **Dependency Visualization**: See how code components depend on each other
2. **Impact Analysis**: Understand what changes when you modify a function or class
3. **Architecture Understanding**: Get insights into codebase structure and patterns
4. **Refactoring Safety**: Identify all relationships before making changes
5. **Code Quality**: Detect orphaned code and unused components
6. **Documentation**: Auto-generate dependency diagrams and documentation

## Testing

Comprehensive test suite covering:
- Import/export parsing accuracy
- Function call detection
- Class inheritance tracking
- Interface implementation recognition
- Complex relationship patterns
- Integration with existing tools

All 130 tests pass, ensuring backward compatibility and new functionality reliability.

## Implementation Details

### Performance Considerations
- Relationship analysis is cached in Neo4j for fast retrieval
- Pattern matching is optimized to avoid false positives
- Batch operations for large codebases

### Future Enhancements
- Visual relationship graphs
- Dependency impact scoring
- Circular dependency detection
- Dead code identification
- Cross-language relationship tracking