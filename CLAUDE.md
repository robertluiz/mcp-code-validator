# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that indexes and validates TypeScript/JavaScript code using AST parsing and Neo4j graph database. The server provides seven main tools focused on preventing AI code hallucinations and improving code quality:

**Core Indexing & Validation:**
1. **indexFile** - Parses source code files and stores functions/classes in Neo4j with file relationships
2. **indexFunctions** - Indexes individual functions without requiring full file context
3. **validateCode** - Checks if code elements (functions/classes) already exist in the knowledge graph
4. **validateFile** - Validates entire files by comparing against the knowledge graph and detecting changes

**AI Assistance & Quality Control:**
5. **detectHallucinations** - Analyzes code to detect potential AI hallucinations (non-existent APIs, impossible patterns)
6. **validateCodeQuality** - Comprehensive code quality analysis with scoring system
7. **suggestImprovements** - Context-aware suggestions based on existing codebase patterns

## Development Commands

- `npm start` - Run development server with ts-node (uses StdioServerTransport)
- `npm run build` - Compile TypeScript to JavaScript in `dist/` folder  
- `npm run serve` - Run compiled server from `dist/server.js`

## Architecture

The codebase has a modular architecture with three main components:

- **server.ts** - Main MCP server implementation with operation handlers for indexFile and validateCode
- **parser.ts** - AST parsing logic using tree-sitter to extract functions and classes from TypeScript code
- **neo4j.ts** - Database connection management and driver initialization

## Environment Setup

Requires `.env` file with Neo4j connection details:
- NEO4J_URI
- NEO4J_USER  
- NEO4J_PASSWORD
- MCP_PORT (optional, defaults to 8080)

## Database Schema

Neo4j stores:
- File nodes with `path` property
- Function nodes with `name`, `language`, `body` properties
- Class nodes with `name`, `language`, `body` properties
- `CONTAINS` relationships from files to functions/classes