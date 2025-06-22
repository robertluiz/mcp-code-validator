import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getDriver, closeDriver } from './neo4j';
import { parseCode, ReactComponent, ReactHook, NextJsPattern, FrontendElement } from './parser';
import { parsePackageJsonDependencies, getLibraryAPI, isKnownLibraryMember, getAllLibraryMembers } from './library-apis';
import { 
    detectJSHallucinations, 
    quickValidateJS,
    npmVerifier,
    jsAPIValidator,
    reactHallucinationDetector,
    vueHallucinationDetector,
    nodeJSHallucinationDetector
} from './js-hallucination-detectors';
import { HTMLCoherenceValidator } from './validators/html-coherence-validator';
import { CSSValidator } from './validators/css-validator';
import { TailwindValidator } from './validators/tailwind-validator';
import { HTMLCSSIndexer } from './html-css-indexer';
import dotenv from 'dotenv';
import { Session } from 'neo4j-driver';

dotenv.config();

const driver = getDriver();

/**
 * Generate a context string that includes branch information
 */
function generateContext(projectContext: string = 'default', branch: string = 'main'): string {
    return `${projectContext}:${branch}`;
}

/**
 * Helper to index all parsed code elements and link them to a parent file node.
 */
async function indexParsedCode(session: Session, parsedCode: any, filePath: string, language: string, projectContext: string = 'default', branch: string = 'main') {
    const context = generateContext(projectContext, branch);
    // Index functions
    for (const func of parsedCode.functions) {
        await session.executeWrite(tx =>
            tx.run(`
                // Find or create the file node with context
                MERGE (file:File {path: $filePath, context: $context})
                // Find or create the function node with context
                MERGE (func:Function {name: $name, language: $language, context: $context})
                ON CREATE SET func.body = $body, func.createdAt = timestamp()
                ON MATCH SET func.body = $body, func.updatedAt = timestamp()
                // Create a relationship from file to function
                MERGE (file)-[:CONTAINS]->(func)
            `, { filePath, name: func.name, language, body: func.body, context })
        );
    }
    
    // Index classes
    for (const cls of parsedCode.classes) {
         await session.executeWrite(tx =>
            tx.run(`
                MERGE (file:File {path: $filePath, context: $context})
                MERGE (c:Class {name: $name, language: $language, context: $context})
                ON CREATE SET c.body = $body, c.createdAt = timestamp()
                ON MATCH SET c.body = $body, c.updatedAt = timestamp()
                MERGE (file)-[:CONTAINS]->(c)
            `, { filePath, name: cls.name, language, body: cls.body, context })
        );
    }
    
    // Index React components
    for (const component of parsedCode.reactComponents || []) {
        await session.executeWrite(tx =>
            tx.run(`
                MERGE (file:File {path: $filePath, context: $context})
                MERGE (comp:ReactComponent {name: $name, language: $language, context: $context})
                ON CREATE SET 
                    comp.type = $type,
                    comp.props = $props,
                    comp.hooks = $hooks,
                    comp.body = $body,
                    comp.isDefaultExport = $isDefaultExport,
                    comp.createdAt = timestamp()
                ON MATCH SET 
                    comp.type = $type,
                    comp.props = $props,
                    comp.hooks = $hooks,
                    comp.body = $body,
                    comp.isDefaultExport = $isDefaultExport,
                    comp.updatedAt = timestamp()
                MERGE (file)-[:CONTAINS]->(comp)
            `, { 
                filePath, 
                name: component.name, 
                language, 
                type: component.type,
                props: component.props,
                hooks: component.hooks,
                body: component.body,
                isDefaultExport: component.isDefaultExport,
                context
            })
        );
    }
    
    // Index React hooks
    for (const hook of parsedCode.reactHooks || []) {
        await session.executeWrite(tx =>
            tx.run(`
                MERGE (file:File {path: $filePath, context: $context})
                MERGE (h:ReactHook {name: $name, type: $type, language: $language, context: $context})
                ON CREATE SET 
                    h.dependencies = $dependencies,
                    h.body = $body,
                    h.createdAt = timestamp()
                ON MATCH SET 
                    h.dependencies = $dependencies,
                    h.body = $body,
                    h.updatedAt = timestamp()
                MERGE (file)-[:USES]->(h)
            `, { 
                filePath, 
                name: hook.name, 
                type: hook.type,
                language, 
                dependencies: hook.dependencies || [],
                body: hook.body,
                context
            })
        );
    }
    
    // Index Next.js patterns
    for (const pattern of parsedCode.nextjsPatterns || []) {
        await session.executeWrite(tx =>
            tx.run(`
                MERGE (file:File {path: $filePath, context: $context})
                MERGE (next:NextJsPattern {name: $name, type: $type, language: $language, context: $context})
                ON CREATE SET 
                    next.exports = $exports,
                    next.body = $body,
                    next.createdAt = timestamp()
                ON MATCH SET 
                    next.exports = $exports,
                    next.body = $body,
                    next.updatedAt = timestamp()
                MERGE (file)-[:IMPLEMENTS]->(next)
            `, { 
                filePath, 
                name: pattern.name, 
                type: pattern.type,
                language, 
                exports: pattern.exports,
                body: pattern.body,
                context
            })
        );
    }
    
    // Index frontend elements (CSS-in-JS, styled components, etc.)
    for (const element of parsedCode.frontendElements || []) {
        await session.executeWrite(tx =>
            tx.run(`
                MERGE (file:File {path: $filePath, context: $context})
                MERGE (fe:FrontendElement {name: $name, type: $type, language: $language, context: $context})
                ON CREATE SET 
                    fe.styles = $styles,
                    fe.body = $body,
                    fe.createdAt = timestamp()
                ON MATCH SET 
                    fe.styles = $styles,
                    fe.body = $body,
                    fe.updatedAt = timestamp()
                MERGE (file)-[:STYLES]->(fe)
            `, { 
                filePath, 
                name: element.name, 
                type: element.type,
                language, 
                styles: element.styles,
                body: element.body,
                context
            })
        );
    }
    
    // Index imports as relationships
    for (const importInfo of parsedCode.imports || []) {
        await session.executeWrite(tx =>
            tx.run(`
                MERGE (file:File {path: $filePath, context: $context})
                MERGE (source:Module {name: $source, context: $context})
                MERGE (file)-[:IMPORTS {imports: $imports}]->(source)
            `, { 
                filePath, 
                source: importInfo.source,
                imports: importInfo.imports,
                context
            })
        );
    }
    
    // Index exports as relationships
    for (const exportInfo of parsedCode.exports || []) {
        await session.executeWrite(tx =>
            tx.run(`
                MERGE (file:File {path: $filePath, context: $context})
                MERGE (item:ExportedItem {name: $name, type: $type, context: $context})
                MERGE (file)-[:EXPORTS]->(item)
            `, { 
                filePath, 
                name: exportInfo.name,
                type: exportInfo.type,
                context
            })
        );
    }
    
    // Analyze and create function call relationships
    await indexFunctionCallRelationships(session, parsedCode, filePath, context);
    
    // Analyze and create class inheritance relationships
    await indexClassInheritanceRelationships(session, parsedCode, filePath, context);
}

// Helper function to analyze function calls within code
async function indexFunctionCallRelationships(session: Session, parsedCode: any, filePath: string, context: string) {
    for (const func of parsedCode.functions) {
        // Simple pattern matching for function calls
        // This could be enhanced with more sophisticated AST analysis
        const functionCallPattern = /(\w+)\s*\(/g;
        let match;
        
        while ((match = functionCallPattern.exec(func.body)) !== null) {
            const calledFunction = match[1];
            
            // Skip common keywords and built-in functions
            if (!['if', 'for', 'while', 'return', 'console', 'typeof', 'instanceof'].includes(calledFunction)) {
                await session.executeWrite(tx =>
                    tx.run(`
                        MATCH (caller:Function {name: $callerName, context: $context})
                        MERGE (called:Function {name: $calledName, context: $context})
                        MERGE (caller)-[:CALLS]->(called)
                    `, { 
                        callerName: func.name,
                        calledName: calledFunction,
                        context
                    })
                );
            }
        }
        
        // Check for class instantiation (new ClassName())
        const classInstantiationPattern = /new\s+(\w+)\s*\(/g;
        while ((match = classInstantiationPattern.exec(func.body)) !== null) {
            const className = match[1];
            
            await session.executeWrite(tx =>
                tx.run(`
                    MATCH (func:Function {name: $functionName, context: $context})
                    MERGE (cls:Class {name: $className, context: $context})
                    MERGE (func)-[:INSTANTIATES]->(cls)
                `, { 
                    functionName: func.name,
                    className: className,
                    context
                })
            );
        }
    }
}

// Helper function to analyze class inheritance
async function indexClassInheritanceRelationships(session: Session, parsedCode: any, filePath: string, context: string) {
    for (const cls of parsedCode.classes) {
        // Look for extends keyword in class body
        const extendsPattern = /class\s+\w+\s+extends\s+(\w+)/i;
        const match = extendsPattern.exec(cls.body);
        
        if (match) {
            const parentClass = match[1];
            
            await session.executeWrite(tx =>
                tx.run(`
                    MATCH (child:Class {name: $childName, context: $context})
                    MERGE (parent:Class {name: $parentName, context: $context})
                    MERGE (child)-[:EXTENDS]->(parent)
                `, { 
                    childName: cls.name,
                    parentName: parentClass,
                    context
                })
            );
        }
        
        // Look for implements keyword
        const implementsPattern = /class\s+\w+.*implements\s+([\w,\s]+)/i;
        const implementsMatch = implementsPattern.exec(cls.body);
        
        if (implementsMatch) {
            const interfaces = implementsMatch[1].split(',').map(i => i.trim());
            
            for (const interfaceName of interfaces) {
                await session.executeWrite(tx =>
                    tx.run(`
                        MATCH (cls:Class {name: $className, context: $context})
                        MERGE (interface:Interface {name: $interfaceName, context: $context})
                        MERGE (cls)-[:IMPLEMENTS]->(interface)
                    `, { 
                        className: cls.name,
                        interfaceName: interfaceName,
                        context
                    })
                );
            }
        }
    }
}



// Create MCP server instance
const server = new McpServer({
    name: 'mcp-code-validator',
    version: '2.0.0'
});

// Register indexFile tool
server.registerTool('indexFile', {
    title: 'Index Code File',
    description: 'Parses and indexes entire source code files, including HTML, CSS, JavaScript, TypeScript, React components, hooks, and Next.js patterns. Supports branch-specific indexing.',
    inputSchema: {
        filePath: z.string().describe('The unique path of the file being indexed (e.g., "src/components/Button.tsx", "public/index.html", "styles/main.css").'),
        content: z.string().describe('The full source code content of the file.'),
        language: z.string().describe('The programming language of the code (e.g., "typescript", "javascript", "html", "css").'),
        fileExtension: z.string().optional().describe('File extension to determine parser (ts, tsx, js, jsx, html, css, scss, sass). Auto-detected from filePath if not provided.'),
        projectContext: z.string().optional().describe('Project context/namespace (e.g., "my-app", "backend-api"). Defaults to "default".'),
        branch: z.string().optional().describe('Git branch name (e.g., "main", "develop", "feature/auth"). Defaults to "main".'),
        verbose: z.boolean().optional().describe('Return detailed information (default: false)')
    }
}, async ({ filePath, content, language, fileExtension, projectContext = 'default', branch = 'main', verbose = false }) => {
    const session = driver.session();
    try {
        // Auto-detect file extension if not provided
        const extension = fileExtension || filePath.split('.').pop() || 'ts';
        
        // Handle HTML and CSS files
        if (['html', 'htm'].includes(extension.toLowerCase())) {
            const htmlIndexer = new HTMLCSSIndexer();
            const isJSX = ['jsx', 'tsx'].includes(extension.toLowerCase());
            const result = await htmlIndexer.indexHTML(session, content, filePath, projectContext, branch, isJSX);
            
            if (verbose) {
                return {
                    content: [{
                        type: 'text',
                        text: `Successfully indexed HTML file: ${filePath}\n\nSummary:\n- HTML Elements: ${result.htmlElements}\n- Relationships: ${result.relationships}\n- Errors: ${result.errors.length ? result.errors.join(', ') : 'None'}`
                    }]
                };
            } else {
                return {
                    content: [{
                        type: 'text',
                        text: `Indexed ${result.htmlElements} HTML elements from ${filePath}`
                    }]
                };
            }
        }
        
        if (['css', 'scss', 'sass', 'less'].includes(extension.toLowerCase())) {
            const cssIndexer = new HTMLCSSIndexer();
            const isStyled = content.includes('styled.') || content.includes('css`');
            const result = await cssIndexer.indexCSS(session, content, filePath, projectContext, branch, isStyled);
            
            if (verbose) {
                return {
                    content: [{
                        type: 'text',
                        text: `Successfully indexed CSS file: ${filePath}\n\nSummary:\n- CSS Rules: ${result.cssRules}\n- CSS Declarations: ${result.cssDeclarations}\n- Relationships: ${result.relationships}\n- Errors: ${result.errors.length ? result.errors.join(', ') : 'None'}`
                    }]
                };
            } else {
                return {
                    content: [{
                        type: 'text',
                        text: `Indexed ${result.cssRules} CSS rules and ${result.cssDeclarations} declarations from ${filePath}`
                    }]
                };
            }
        }
        
        // Handle JavaScript/TypeScript files (existing logic)
        const parsedCode = parseCode(content, extension);
        await indexParsedCode(session, parsedCode, filePath, language, projectContext, branch);

        const totalElements = parsedCode.functions.length + 
                             parsedCode.classes.length + 
                             (parsedCode.reactComponents?.length || 0) +
                             (parsedCode.reactHooks?.length || 0) +
                             (parsedCode.nextjsPatterns?.length || 0) +
                             (parsedCode.frontendElements?.length || 0);

        if (verbose) {
            const summary = {
                indexedFunctions: parsedCode.functions.length,
                indexedClasses: parsedCode.classes.length,
                indexedReactComponents: parsedCode.reactComponents?.length || 0,
                indexedReactHooks: parsedCode.reactHooks?.length || 0,
                indexedNextJsPatterns: parsedCode.nextjsPatterns?.length || 0,
                indexedFrontendElements: parsedCode.frontendElements?.length || 0,
                indexedImports: parsedCode.imports?.length || 0,
                indexedExports: parsedCode.exports?.length || 0
            };

            return {
                content: [{
                    type: 'text',
                    text: `Successfully indexed file: ${filePath}\n\nSummary:\n- Functions: ${summary.indexedFunctions}\n- Classes: ${summary.indexedClasses}\n- React Components: ${summary.indexedReactComponents}\n- React Hooks: ${summary.indexedReactHooks}\n- Next.js Patterns: ${summary.indexedNextJsPatterns}\n- Frontend Elements: ${summary.indexedFrontendElements}\n- Imports: ${summary.indexedImports}\n- Exports: ${summary.indexedExports}`
                }]
            };
        }

        // Concise return by default
        return {
            content: [{
                type: 'text',
                text: `✓ ${filePath}: ${totalElements} elements`
            }]
        };
    } catch (error: any) {
        console.error('Error in indexFile:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to index file: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register validateCode tool
server.registerTool('validateCode', {
    title: 'Validate Code',
    description: 'Validates new code by checking for the existence of its functions and classes in the Neo4j knowledge graph. Supports branch-specific validation.',
    inputSchema: {
        code: z.string().describe('The new source code snippet to validate.'),
        language: z.string().describe('The programming language of the code.'),
        projectContext: z.string().optional().describe('Project context/namespace to validate against. Defaults to "default".'),
        branch: z.string().optional().describe('Git branch name to validate against. Defaults to "main".'),
        verbose: z.boolean().optional().describe('Include code bodies in response (default: false)')
    }
}, async ({ code, language, projectContext = 'default', branch = 'main', verbose = false }) => {
    const context = generateContext(projectContext, branch);
    const parsedCode = parseCode(code);
    const validationResults: any[] = [];
    const session = driver.session();

    try {
        // Validate functions
        for (const func of parsedCode.functions) {
            const result = await session.executeRead(tx =>
                tx.run('MATCH (f:Function {name: $name, language: $language, context: $context}) RETURN f.body AS body, f.updatedAt as updatedAt', { name: func.name, language, context })
            );
            if (result.records.length > 0) {
                const validationResult: any = {
                    elementName: func.name,
                    elementType: 'Function',
                    status: 'FOUND',
                    message: 'Exists'
                };
                
                if (verbose) {
                    validationResult.indexedBody = result.records[0].get('body');
                    validationResult.message = 'A function with this name already exists.';
                }
                
                validationResults.push(validationResult);
            } else {
                validationResults.push({
                    elementName: func.name,
                    elementType: 'Function',
                    status: 'NOT_FOUND',
                    message: verbose ? 'This function does not exist in the knowledge graph. It might be new or a hallucination.' : 'New'
                });
            }
        }
        // NOTE: Could add similar validation for classes here

        if (verbose) {
            const resultsText = validationResults.map(result => 
                `${result.elementType} "${result.elementName}": ${result.status} - ${result.message}`
            ).join('\n');

            return {
                content: [{
                    type: 'text',
                    text: `Validation Results:\n${resultsText}`
                }]
            };
        }

        // Concise format
        const found = validationResults.filter(r => r.status === 'FOUND').length;
        const notFound = validationResults.filter(r => r.status === 'NOT_FOUND').length;
        
        return {
            content: [{
                type: 'text',
                text: `✓ Validated: ${found} exist, ${notFound} new`
            }]
        };
    } catch (error: any) {
        console.error('Error validating code:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to validate code: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register indexFunctions tool
server.registerTool('indexFunctions', {
    title: 'Index Functions',
    description: 'Indexes a list of individual functions into Neo4j without requiring a full file context. Supports branch-specific indexing.',
    inputSchema: {
        functions: z.array(z.object({
            name: z.string().describe('The function name'),
            body: z.string().describe('The function body/implementation'),
            filePath: z.string().optional().describe('Optional file path where the function belongs')
        })).describe('Array of functions to index'),
        language: z.string().describe('The programming language of the functions'),
        projectContext: z.string().optional().describe('Project context/namespace (e.g., "my-app", "backend-api"). Defaults to "default".'),
        branch: z.string().optional().describe('Git branch name. Defaults to "main".')
    }
}, async ({ functions, language, projectContext = 'default', branch = 'main' }) => {
    const context = generateContext(projectContext, branch);
    const session = driver.session();
    try {
        let indexedCount = 0;
        
        for (const func of functions) {
            await session.executeWrite(tx =>
                tx.run(`
                    // Create or update the function node with context
                    MERGE (f:Function {name: $name, language: $language, context: $context})
                    ON CREATE SET f.body = $body, f.createdAt = timestamp()
                    ON MATCH SET f.body = $body, f.updatedAt = timestamp()
                    // Optionally link to file if filePath is provided
                    WITH f
                    CALL {
                        WITH f
                        CASE WHEN $filePath IS NOT NULL
                        THEN 
                            MERGE (file:File {path: $filePath, context: $context})
                            MERGE (file)-[:CONTAINS]->(f)
                        ELSE
                            RETURN f
                        END
                        RETURN f as func
                    }
                    RETURN func
                `, { 
                    name: func.name, 
                    language, 
                    body: func.body,
                    filePath: func.filePath || null,
                    context
                })
            );
            indexedCount++;
        }

        return {
            content: [{
                type: 'text',
                text: `Successfully indexed ${indexedCount} functions in ${language}`
            }]
        };
    } catch (error: any) {
        console.error('Error in indexFunctions:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to index functions: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register validateFile tool
server.registerTool('validateFile', {
    title: 'Validate File',
    description: 'Validates an entire file by checking if it exists in the knowledge graph and comparing its functions and classes. Supports branch-specific validation.',
    inputSchema: {
        filePath: z.string().describe('The file path to validate'),
        content: z.string().describe('The file content to validate against the knowledge graph'),
        language: z.string().describe('The programming language of the file'),
        projectContext: z.string().optional().describe('Project context/namespace (e.g., "my-app", "backend-api"). Defaults to "default".'),
        branch: z.string().optional().describe('Git branch name to validate against. Defaults to "main".'),
        verbose: z.boolean().optional().describe('Return detailed validation results (default: false)')
    }
}, async ({ filePath, content, language, projectContext = 'default', branch = 'main', verbose = false }) => {
    const context = generateContext(projectContext, branch);
    const session = driver.session();
    try {
        // Check if file exists in knowledge graph with context
        const fileResult = await session.executeRead(tx =>
            tx.run('MATCH (f:File {path: $filePath, context: $context}) RETURN f', { filePath, context })
        );

        const fileExists = fileResult.records.length > 0;
        const parsedCode = parseCode(content);
        const validationResults: any[] = [];

        // Batch validate all functions at once
        if (parsedCode.functions.length > 0) {
            const functionNames = parsedCode.functions.map(f => f.name);
            const batchResult = await session.executeRead(tx =>
                tx.run(`
                    MATCH (file:File {path: $filePath, context: $context})-[:CONTAINS]->(f:Function {context: $context})
                    WHERE f.name IN $names AND f.language = $language
                    RETURN f.name AS name, f.body AS body
                `, { filePath, names: functionNames, language, context })
            );

            const existingFunctions = new Map();
            batchResult.records.forEach(record => {
                existingFunctions.set(record.get('name'), record.get('body'));
            });

            parsedCode.functions.forEach(func => {
                if (existingFunctions.has(func.name)) {
                    const existingBody = existingFunctions.get(func.name);
                    const bodyMatches = existingBody === func.body;
                    
                    validationResults.push({
                        elementName: func.name,
                        elementType: 'Function',
                        status: bodyMatches ? 'MATCH' : 'MODIFIED',
                        hasChanges: !bodyMatches
                    });
                } else {
                    validationResults.push({
                        elementName: func.name,
                        elementType: 'Function',
                        status: 'NEW',
                        hasChanges: true
                    });
                }
            });
        }

        // Validate classes in the file
        for (const cls of parsedCode.classes) {
            const clsResult = await session.executeRead(tx =>
                tx.run(`
                    MATCH (file:File {path: $filePath, context: $context})-[:CONTAINS]->(c:Class {name: $name, language: $language, context: $context})
                    RETURN c.body AS body, c.updatedAt as updatedAt
                `, { filePath, name: cls.name, language, context })
            );

            if (clsResult.records.length > 0) {
                const existingBody = clsResult.records[0].get('body');
                const bodyMatches = existingBody === cls.body;
                
                validationResults.push({
                    elementName: cls.name,
                    elementType: 'Class',
                    status: bodyMatches ? 'MATCH' : 'MODIFIED',
                    message: bodyMatches 
                        ? 'Class exists and matches exactly'
                        : 'Class exists but has been modified',
                    hasChanges: !bodyMatches
                });
            } else {
                validationResults.push({
                    elementName: cls.name,
                    elementType: 'Class',
                    status: 'NEW',
                    message: 'Class is new and not in knowledge graph',
                    hasChanges: true
                });
            }
        }

        const summary = {
            fileExists,
            totalElements: validationResults.length,
            newElements: validationResults.filter(r => r.status === 'NEW').length,
            modifiedElements: validationResults.filter(r => r.status === 'MODIFIED').length,
            matchingElements: validationResults.filter(r => r.status === 'MATCH').length
        };

        if (verbose) {
            const resultsText = [
                `File validation for: ${filePath}`,
                `File exists in knowledge graph: ${fileExists ? 'Yes' : 'No'}`,
                `\nSummary:`,
                `- Total elements: ${summary.totalElements}`,
                `- New elements: ${summary.newElements}`,
                `- Modified elements: ${summary.modifiedElements}`,
                `- Matching elements: ${summary.matchingElements}`,
                `\nDetailed results:`
            ].join('\n');

            const detailedResults = validationResults.map(result => {
                const msg = result.status === 'MATCH' ? 'Function exists and matches exactly' :
                           result.status === 'MODIFIED' ? 'Function exists but has been modified' :
                           'Function is new and not in knowledge graph';
                return `${result.elementType} "${result.elementName}": ${result.status} - ${msg}`;
            }).join('\n');

            return {
                content: [{
                    type: 'text',
                    text: `${resultsText}\n${detailedResults}`
                }]
            };
        }

        // Concise return
        const status = !fileExists ? 'new file' :
                      summary.modifiedElements > 0 ? 'modified' :
                      summary.newElements > 0 ? 'updated' : 'unchanged';
        
        return {
            content: [{
                type: 'text',
                text: `✓ ${filePath}: ${status} (${summary.matchingElements}✓/${summary.modifiedElements}±/${summary.newElements}+)`
            }]
        };
    } catch (error: any) {
        console.error('Error validating file:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to validate file: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register detectHallucinations tool
server.registerTool('detectHallucinations', {
    title: 'Detect Code Hallucinations',
    description: 'Analyzes code to detect potential AI hallucinations by checking for non-existent APIs, impossible patterns, and inconsistencies.',
    inputSchema: {
        code: z.string().describe('The code to analyze for hallucinations'),
        language: z.string().describe('Programming language'),
        context: z.string().optional().describe('Project context/namespace (e.g., "my-app", "backend-api"). Defaults to "default".'),
        projectContext: z.object({
            availableLibraries: z.array(z.string()).optional().describe('List of available libraries/packages'),
            projectApis: z.array(z.string()).optional().describe('List of project-specific APIs'),
            allowedPatterns: z.array(z.string()).optional().describe('List of allowed code patterns')
        }).optional().describe('Context information about the project')
    }
}, async ({ code, language, context = 'default', projectContext = {} }) => {
    const session = driver.session();
    try {
        const parsedCode = parseCode(code);
        const hallucinations: any[] = [];
        
        // Check for non-existent functions in knowledge graph
        for (const func of parsedCode.functions) {
            const result = await session.executeRead(tx =>
                tx.run('MATCH (f:Function {name: $name, language: $language, context: $context}) RETURN f.name', { name: func.name, language, context })
            );
            
            if (result.records.length === 0) {
                // Check if function exists in known library APIs
                const libResult = await session.executeRead(tx =>
                    tx.run('MATCH (lf:LibraryFunction {name: $name, context: $context}) RETURN lf.library', { name: func.name, context })
                );
                
                if (libResult.records.length === 0) {
                    // Check if it's a potentially hallucinated function
                    const suspiciousPatterns = [
                        /get.*Api|fetch.*Data|load.*Config/i, // Common hallucinated API patterns
                        /process.*Request|handle.*Response/i,
                        /validate.*Schema|parse.*Json/i,
                        /connect.*Database|query.*Table/i
                    ];
                    
                    const isSuspicious = suspiciousPatterns.some(pattern => 
                        pattern.test(func.name) || pattern.test(func.body)
                    );
                    
                    if (isSuspicious) {
                        hallucinations.push({
                            type: 'SUSPICIOUS_FUNCTION',
                            element: func.name,
                            confidence: 0.7,
                            reason: 'Function uses common hallucination patterns and not found in knowledge graph or library APIs',
                            suggestion: 'Verify this function exists in your codebase, available libraries, or create it'
                        });
                    }
                }
            }
        }
        
        // Check for impossible imports/requires
        const importPatterns = [
            /import.*from\s+['"`]([^'"`]+)['"`]/g,
            /require\(['"`]([^'"`]+)['"`]\)/g
        ];
        
        for (const pattern of importPatterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                const importPath = match[1];
                
                // First check if it's a known library in our API database
                const isKnownLibrary = getLibraryAPI(importPath) !== null;
                
                if (!isKnownLibrary) {
                    // Check if library exists in indexed dependencies
                    const libResult = await session.executeRead(tx =>
                        tx.run('MATCH (lib:Library {name: $name, context: $context}) RETURN lib', { name: importPath, context })
                    );
                    
                    const isIndexed = libResult.records.length > 0;
                    
                    if (!isIndexed) {
                        // Check against available libraries if provided
                        if (projectContext.availableLibraries) {
                            const isAvailable = projectContext.availableLibraries.some(lib => 
                                importPath.includes(lib) || lib.includes(importPath)
                            );
                            
                            if (!isAvailable) {
                                hallucinations.push({
                                    type: 'UNKNOWN_IMPORT',
                                    element: importPath,
                                    confidence: 0.8,
                                    reason: 'Import not found in available libraries list',
                                    suggestion: `Verify that '${importPath}' is installed and available`
                                });
                            }
                        } else {
                            // No context provided, mark as unknown
                            hallucinations.push({
                                type: 'UNKNOWN_IMPORT',
                                element: importPath,
                                confidence: 0.6,
                                reason: 'Import not found in known library APIs or indexed dependencies',
                                suggestion: `Library '${importPath}' not recognized. Add to package.json dependencies or verify spelling.`
                            });
                        }
                    }
                }
                
                // Check for common hallucinated packages
                const commonHallucinations = [
                    'magic-sdk', 'auto-validator', 'smart-parser',
                    'ai-helper', 'universal-connector', 'super-utils',
                    // React/Frontend specific hallucinations
                    'react-auto-hooks', 'next-magic-router', 'styled-auto',
                    'chakra-smart', 'tailwind-magic', 'emotion-auto',
                    'react-super-forms', 'next-super-auth', 'react-magic-state',
                    'auto-styled-components', 'smart-react-router', 'magic-next-api'
                ];
                
                if (commonHallucinations.some(lib => importPath.includes(lib))) {
                    hallucinations.push({
                        type: 'LIKELY_HALLUCINATION',
                        element: importPath,
                        confidence: 0.9,
                        reason: 'Import matches common AI hallucination patterns',
                        suggestion: `'${importPath}' appears to be a hallucinated package name`
                    });
                }
            }
        }
        
        // Check for inconsistent API usage
        const apiCallPatterns = [
            /\w+\.(\w+)\(/g, // method calls
            /await\s+(\w+)\(/g // async calls
        ];
        
        for (const pattern of apiCallPatterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                const apiCall = match[1];
                
                // Check against known project APIs
                if (projectContext.projectApis && !projectContext.projectApis.includes(apiCall)) {
                    const result = await session.executeRead(tx =>
                        tx.run(`
                            MATCH (f:Function {context: $context}) 
                            WHERE f.name CONTAINS $apiCall OR f.body CONTAINS $apiCall
                            RETURN f.name LIMIT 1
                        `, { apiCall, context })
                    );
                    
                    if (result.records.length === 0) {
                        hallucinations.push({
                            type: 'UNKNOWN_API_CALL',
                            element: apiCall,
                            confidence: 0.6,
                            reason: 'API call not found in project codebase',
                            suggestion: `Verify that '${apiCall}' API exists and is properly implemented`
                        });
                    }
                }
            }
        }
        
        // Check for React/Next.js specific hallucinations
        const fileExtension = code.includes('jsx') || code.includes('<') ? 'tsx' : 'ts';
        const frontendParsedCode = parseCode(code, fileExtension);
        
        // Check for hallucinated React hooks
        for (const hook of frontendParsedCode.reactHooks || []) {
            // First check if hook exists in React library
            const isKnownReactHook = isKnownLibraryMember('react', hook.name, 'hook');
            
            if (!isKnownReactHook) {
                // Check if it's indexed as a library hook
                const libHookResult = await session.executeRead(tx =>
                    tx.run('MATCH (lh:LibraryHook {name: $name, context: $context}) RETURN lh.library', { name: hook.name, context })
                );
                
                if (libHookResult.records.length === 0) {
                    const hallucinatedHooks = [
                        'useAutoState', 'useMagicEffect', 'useSmartCallback',
                        'useAutoFetch', 'useMagicRouter', 'useSmartAuth',
                        'useAutoForm', 'useMagicAnimation', 'useSmartData'
                    ];
                    
                    if (hallucinatedHooks.includes(hook.name)) {
                        hallucinations.push({
                            type: 'HALLUCINATED_REACT_HOOK',
                            element: hook.name,
                            confidence: 0.9,
                            reason: 'Hook name follows common AI hallucination patterns for React',
                            suggestion: `'${hook.name}' appears to be a hallucinated React hook. Use standard hooks or verify custom hook exists.`
                        });
                    } else if (hook.name.startsWith('use') && hook.name.length > 3) {
                        // Unknown custom hook
                        hallucinations.push({
                            type: 'UNKNOWN_REACT_HOOK',
                            element: hook.name,
                            confidence: 0.6,
                            reason: 'Custom hook not found in project or known libraries',
                            suggestion: `Hook '${hook.name}' not found. Verify it exists in your codebase or install required library.`
                        });
                    }
                }
            }
        }
        
        // Check for hallucinated Next.js patterns
        for (const pattern of frontendParsedCode.nextjsPatterns || []) {
            const hallucinatedNextPatterns = [
                'getAutoProps', 'getMagicServerSideProps', 'getSmartStaticProps',
                'autoGenerateMetadata', 'magicMiddleware', 'smartApiHandler'
            ];
            
            if (hallucinatedNextPatterns.some(p => pattern.name.includes(p) || p.includes(pattern.name))) {
                hallucinations.push({
                    type: 'HALLUCINATED_NEXTJS_PATTERN',
                    element: pattern.name,
                    confidence: 0.85,
                    reason: 'Next.js pattern name follows common AI hallucination patterns',
                    suggestion: `'${pattern.name}' appears to be a hallucinated Next.js pattern. Use standard Next.js APIs.`
                });
            }
        }
        
        // Check for hallucinated CSS-in-JS/styled components
        if (code.includes('styled.') || code.includes('css`')) {
            const hallucinatedStyledPatterns = [
                'styled.auto', 'styled.magic', 'styled.smart',
                'autoStyled', 'magicCss', 'smartTheme'
            ];
            
            for (const styledPattern of hallucinatedStyledPatterns) {
                if (code.includes(styledPattern)) {
                    hallucinations.push({
                        type: 'HALLUCINATED_STYLED_COMPONENT',
                        element: styledPattern,
                        confidence: 0.8,
                        reason: 'Styled component pattern appears to be hallucinated',
                        suggestion: `'${styledPattern}' is not a real styled-components API. Use standard styled-components syntax.`
                    });
                }
            }
        }
        
        // Check for React component hallucinations
        for (const component of frontendParsedCode.reactComponents || []) {
            // Check for impossible component patterns
            const impossiblePatterns = [
                /Auto[A-Z]\w+Component/,
                /Magic[A-Z]\w+/,
                /Smart[A-Z]\w+Provider/,
                /Universal[A-Z]\w+/
            ];
            
            const isImpossible = impossiblePatterns.some(pattern => pattern.test(component.name));
            
            if (isImpossible) {
                hallucinations.push({
                    type: 'HALLUCINATED_REACT_COMPONENT',
                    element: component.name,
                    confidence: 0.75,
                    reason: 'Component name follows impossible/hallucinated patterns',
                    suggestion: `'${component.name}' appears to be a hallucinated component name. Use conventional React component naming.`
                });
            }
        }
        
        // Analyze confidence and generate summary
        const highConfidenceHallucinations = hallucinations.filter(h => h.confidence >= 0.8);
        const mediumConfidenceHallucinations = hallucinations.filter(h => h.confidence >= 0.6 && h.confidence < 0.8);
        
        const summary = {
            totalHallucinations: hallucinations.length,
            highConfidence: highConfidenceHallucinations.length,
            mediumConfidence: mediumConfidenceHallucinations.length,
            riskLevel: hallucinations.length === 0 ? 'LOW' : 
                      highConfidenceHallucinations.length > 0 ? 'HIGH' : 'MEDIUM'
        };
        
        const reportText = [
            `Hallucination Detection Report:`,
            `Risk Level: ${summary.riskLevel}`,
            `Total Issues: ${summary.totalHallucinations}`,
            `High Confidence: ${summary.highConfidence}`,
            `Medium Confidence: ${summary.mediumConfidence}`,
            ``,
            `Detailed Analysis:`
        ].join('\n');
        
        const detailedResults = hallucinations.map(h => 
            `${h.type}: "${h.element}" (${Math.round(h.confidence * 100)}% confidence)
  Reason: ${h.reason}
  Suggestion: ${h.suggestion}`
        ).join('\n\n');
        
        return {
            content: [{
                type: 'text',
                text: hallucinations.length > 0 
                    ? `${reportText}\n\n${detailedResults}`
                    : 'No potential hallucinations detected. Code appears consistent with knowledge graph.'
            }]
        };
    } catch (error: any) {
        console.error('Error in detectHallucinations:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to analyze hallucinations: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register validateCodeQuality tool
server.registerTool('validateCodeQuality', {
    title: 'Validate Code Quality',
    description: 'Analyzes code quality against established patterns in the knowledge graph and detects potential issues.',
    inputSchema: {
        code: z.string().describe('Code to analyze for quality issues'),
        language: z.string().describe('Programming language'),
        checkTypes: z.array(z.enum(['naming', 'structure', 'complexity', 'patterns', 'security'])).optional().describe('Types of quality checks to perform'),
        context: z.string().optional().describe('Project context/namespace (e.g., "my-app", "backend-api"). Defaults to "default".')
    }
}, async ({ code, language, checkTypes = ['naming', 'structure', 'complexity', 'patterns'], context = 'default' }) => {
    const session = driver.session();
    try {
        const parsedCode = parseCode(code);
        const qualityIssues: any[] = [];
        
        // Naming Convention Analysis
        if (checkTypes.includes('naming')) {
            // Get naming patterns from knowledge graph
            const namingResult = await session.executeRead(tx =>
                tx.run(`
                    MATCH (f:Function {language: $language, context: $context})
                    RETURN f.name as name
                    ORDER BY f.createdAt DESC
                    LIMIT 100
                `, { language, context })
            );
            
            const existingNames = namingResult.records.map(r => r.get('name'));
            
            for (const func of parsedCode.functions) {
                // Check naming conventions
                const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(func.name);
                const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(func.name);
                const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(func.name);
                
                // Determine project naming pattern
                const projectUsesSnakeCase = existingNames.filter(name => /^[a-z][a-z0-9_]*$/.test(name)).length;
                const projectUsesCamelCase = existingNames.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;
                
                const expectedPattern = projectUsesCamelCase > projectUsesSnakeCase ? 'camelCase' : 'snake_case';
                const followsPattern = expectedPattern === 'camelCase' ? isCamelCase : isSnakeCase;
                
                if (!followsPattern) {
                    qualityIssues.push({
                        type: 'NAMING_CONVENTION',
                        element: func.name,
                        severity: 'MEDIUM',
                        message: `Function name doesn't follow project's ${expectedPattern} convention`,
                        suggestion: `Consider renaming to follow ${expectedPattern} pattern`
                    });
                }
            }
        }
        
        // Structural Analysis
        if (checkTypes.includes('structure')) {
            for (const func of parsedCode.functions) {
                // Check function length
                const lineCount = func.body.split('\n').length;
                if (lineCount > 50) {
                    qualityIssues.push({
                        type: 'FUNCTION_TOO_LONG',
                        element: func.name,
                        severity: 'HIGH',
                        message: `Function has ${lineCount} lines, exceeding recommended 50 lines`,
                        suggestion: 'Consider breaking this function into smaller, more focused functions'
                    });
                }
                
                // Check for deeply nested code
                const nestingLevel = (func.body.match(/{/g) || []).length;
                if (nestingLevel > 4) {
                    qualityIssues.push({
                        type: 'DEEP_NESTING',
                        element: func.name,
                        severity: 'MEDIUM',
                        message: `Function has deep nesting (${nestingLevel} levels)`,
                        suggestion: 'Consider refactoring to reduce nesting complexity'
                    });
                }
            }
        }
        
        // Pattern Analysis
        if (checkTypes.includes('patterns')) {
            // Check for common anti-patterns
            const antiPatterns = [
                { pattern: /console\.log/g, message: 'Debug console.log statements found', severity: 'LOW' },
                { pattern: /debugger;/g, message: 'Debugger statements found', severity: 'MEDIUM' },
                { pattern: /eval\(/g, message: 'Dangerous eval() usage found', severity: 'HIGH' },
                { pattern: /document\.write/g, message: 'Deprecated document.write usage', severity: 'MEDIUM' }
            ];
            
            for (const antiPattern of antiPatterns) {
                const matches = code.match(antiPattern.pattern);
                if (matches) {
                    qualityIssues.push({
                        type: 'ANTI_PATTERN',
                        element: matches[0],
                        severity: antiPattern.severity,
                        message: antiPattern.message,
                        suggestion: 'Remove or replace with better alternatives'
                    });
                }
            }
        }
        
        // Security Analysis
        if (checkTypes.includes('security')) {
            const securityPatterns = [
                { pattern: /password\s*=\s*['"`][^'"`]+['"`]/gi, message: 'Hard-coded password detected' },
                { pattern: /api_key\s*=\s*['"`][^'"`]+['"`]/gi, message: 'Hard-coded API key detected' },
                { pattern: /innerHTML\s*=/gi, message: 'Potential XSS vulnerability with innerHTML' },
                { pattern: /document\.cookie/gi, message: 'Direct cookie manipulation detected' }
            ];
            
            for (const secPattern of securityPatterns) {
                const matches = code.match(secPattern.pattern);
                if (matches) {
                    qualityIssues.push({
                        type: 'SECURITY_ISSUE',
                        element: matches[0],
                        severity: 'HIGH',
                        message: secPattern.message,
                        suggestion: 'Review and fix security vulnerability'
                    });
                }
            }
        }
        
        // Generate quality score
        const highSeverityCount = qualityIssues.filter(i => i.severity === 'HIGH').length;
        const mediumSeverityCount = qualityIssues.filter(i => i.severity === 'MEDIUM').length;
        const lowSeverityCount = qualityIssues.filter(i => i.severity === 'LOW').length;
        
        const qualityScore = Math.max(0, 100 - (highSeverityCount * 20 + mediumSeverityCount * 10 + lowSeverityCount * 5));
        
        const summary = {
            qualityScore,
            totalIssues: qualityIssues.length,
            highSeverity: highSeverityCount,
            mediumSeverity: mediumSeverityCount,
            lowSeverity: lowSeverityCount,
            grade: qualityScore >= 90 ? 'A' : qualityScore >= 80 ? 'B' : qualityScore >= 70 ? 'C' : qualityScore >= 60 ? 'D' : 'F'
        };
        
        const reportText = [
            `Code Quality Analysis Report:`,
            `Quality Score: ${summary.qualityScore}/100 (Grade: ${summary.grade})`,
            `Total Issues: ${summary.totalIssues}`,
            `High Severity: ${summary.highSeverity}`,
            `Medium Severity: ${summary.mediumSeverity}`,
            `Low Severity: ${summary.lowSeverity}`,
            ``,
            `Issues Found:`
        ].join('\n');
        
        const detailedIssues = qualityIssues.map(issue => 
            `${issue.severity}: ${issue.type}
  Element: ${issue.element}
  Message: ${issue.message}
  Suggestion: ${issue.suggestion}`
        ).join('\n\n');
        
        return {
            content: [{
                type: 'text',
                text: qualityIssues.length > 0 
                    ? `${reportText}\n\n${detailedIssues}`
                    : `Code Quality Analysis: ${summary.qualityScore}/100 (Grade: ${summary.grade})\nNo issues found!`
            }]
        };
    } catch (error: any) {
        console.error('Error in validateCodeQuality:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to analyze code quality: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register suggestImprovements tool
server.registerTool('suggestImprovements', {
    title: 'Suggest Code Improvements',
    description: 'Analyzes code against knowledge graph patterns to suggest improvements and best practices.',
    inputSchema: {
        code: z.string().describe('Code to analyze for improvements'),
        language: z.string().describe('Programming language'),
        focusAreas: z.array(z.enum(['performance', 'readability', 'maintainability', 'consistency'])).optional().describe('Areas to focus improvement suggestions on'),
        context: z.string().optional().describe('Project context/namespace (e.g., "my-app", "backend-api"). Defaults to "default".')
    }
}, async ({ code, language, focusAreas = ['performance', 'readability', 'maintainability', 'consistency'], context = 'default' }) => {
    const session = driver.session();
    try {
        const parsedCode = parseCode(code);
        const suggestions: any[] = [];
        
        // Get similar patterns from knowledge graph
        for (const func of parsedCode.functions) {
            const similarFunctions = await session.executeRead(tx =>
                tx.run(`
                    MATCH (f:Function {language: $language, context: $context})
                    WHERE f.name CONTAINS $namePart OR $namePart CONTAINS f.name
                    RETURN f.name, f.body, f.updatedAt
                    ORDER BY f.updatedAt DESC
                    LIMIT 10
                `, { language, namePart: func.name.substring(0, Math.min(func.name.length, 5)), context })
            );
            
            if (similarFunctions.records.length > 0) {
                const patterns = similarFunctions.records.map(r => ({
                    name: r.get('name'),
                    body: r.get('body')
                }));
                
                // Analyze patterns for suggestions
                if (focusAreas.includes('consistency')) {
                    // Check error handling patterns
                    const hasErrorHandling = func.body.includes('try') || func.body.includes('catch');
                    const patternsWithErrorHandling = patterns.filter(p => 
                        p.body.includes('try') || p.body.includes('catch')
                    ).length;
                    
                    if (!hasErrorHandling && patternsWithErrorHandling > patterns.length / 2) {
                        suggestions.push({
                            type: 'ERROR_HANDLING',
                            element: func.name,
                            priority: 'MEDIUM',
                            message: 'Similar functions in codebase use error handling',
                            suggestion: 'Consider adding try-catch blocks for error handling consistency',
                            example: 'try { /* your code */ } catch (error) { /* handle error */ }'
                        });
                    }
                }
                
                if (focusAreas.includes('performance')) {
                    // Check for async patterns
                    const isAsync = func.body.includes('await') || func.body.includes('Promise');
                    const patternsWithAsync = patterns.filter(p => 
                        p.body.includes('await') || p.body.includes('Promise')
                    ).length;
                    
                    if (!isAsync && patternsWithAsync > patterns.length / 2 && func.body.length > 100) {
                        suggestions.push({
                            type: 'ASYNC_PATTERN',
                            element: func.name,
                            priority: 'HIGH',
                            message: 'Similar functions use async patterns for better performance',
                            suggestion: 'Consider making this function async if it performs I/O operations',
                            example: 'async function ' + func.name + '() { await someOperation(); }'
                        });
                    }
                }
            }
        }
        
        // Readability improvements
        if (focusAreas.includes('readability')) {
            for (const func of parsedCode.functions) {
                // Check for magic numbers
                const magicNumbers = func.body.match(/\b\d{2,}\b/g);
                if (magicNumbers && magicNumbers.length > 2) {
                    suggestions.push({
                        type: 'MAGIC_NUMBERS',
                        element: func.name,
                        priority: 'LOW',
                        message: 'Function contains magic numbers',
                        suggestion: 'Consider extracting numbers into named constants',
                        example: 'const MAX_RETRIES = 3; const TIMEOUT_MS = 5000;'
                    });
                }
                
                // Check for long parameter lists
                const paramMatch = func.body.match(/function\s+\w+\s*\(([^)]*)\)/);
                if (paramMatch) {
                    const paramCount = paramMatch[1] ? paramMatch[1].split(',').length : 0;
                    if (paramCount > 4) {
                        suggestions.push({
                            type: 'TOO_MANY_PARAMETERS',
                            element: func.name,
                            priority: 'MEDIUM',
                            message: `Function has ${paramCount} parameters`,
                            suggestion: 'Consider using an options object to group related parameters',
                            example: 'function myFunc(options) { const { param1, param2, param3 } = options; }'
                        });
                    }
                }
            }
        }
        
        // Maintainability improvements
        if (focusAreas.includes('maintainability')) {
            // Check for code duplication patterns
            const allFunctionBodies = await session.executeRead(tx =>
                tx.run(`
                    MATCH (f:Function {language: $language, context: $context})
                    RETURN f.body
                    LIMIT 50
                `, { language, context })
            );
            
            const existingBodies = allFunctionBodies.records.map(r => r.get('body'));
            
            for (const func of parsedCode.functions) {
                const similarBodies = existingBodies.filter(body => {
                    const similarity = calculateSimilarity(func.body, body);
                    return similarity > 0.7 && similarity < 1.0;
                });
                
                if (similarBodies.length > 0) {
                    suggestions.push({
                        type: 'CODE_DUPLICATION',
                        element: func.name,
                        priority: 'HIGH',
                        message: 'Similar code patterns found in codebase',
                        suggestion: 'Consider extracting common logic into a shared utility function',
                        example: 'Extract common patterns into reusable functions'
                    });
                }
            }
        }
        
        const summary = {
            totalSuggestions: suggestions.length,
            highPriority: suggestions.filter(s => s.priority === 'HIGH').length,
            mediumPriority: suggestions.filter(s => s.priority === 'MEDIUM').length,
            lowPriority: suggestions.filter(s => s.priority === 'LOW').length
        };
        
        const reportText = [
            `Code Improvement Suggestions:`,
            `Total Suggestions: ${summary.totalSuggestions}`,
            `High Priority: ${summary.highPriority}`,
            `Medium Priority: ${summary.mediumPriority}`,
            `Low Priority: ${summary.lowPriority}`,
            ``,
            `Detailed Suggestions:`
        ].join('\n');
        
        const detailedSuggestions = suggestions.map(s => 
            `${s.priority}: ${s.type}
  Function: ${s.element}
  Message: ${s.message}
  Suggestion: ${s.suggestion}
  Example: ${s.example}`
        ).join('\n\n');
        
        return {
            content: [{
                type: 'text',
                text: suggestions.length > 0 
                    ? `${reportText}\n\n${detailedSuggestions}`
                    : 'No improvement suggestions found. Code follows established patterns well!'
            }]
        };
    } catch (error: any) {
        console.error('Error in suggestImprovements:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to generate suggestions: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register validateReactHooks tool
server.registerTool('validateReactHooks', {
    title: 'Validate React Hooks Usage',
    description: 'Validates React hooks usage against best practices and detects potential issues with hook dependencies and rules.',
    inputSchema: {
        code: z.string().describe('React component code to analyze for hooks usage'),
        language: z.string().describe('Programming language (typescript/javascript)'),
        fileExtension: z.string().optional().describe('File extension (tsx/jsx/ts/js)'),
        context: z.string().optional().describe('Project context/namespace (e.g., "my-app", "backend-api"). Defaults to "default".')
    }
}, async ({ code, language, fileExtension, context = 'default' }) => {
    const session = driver.session();
    try {
        const extension = fileExtension || (language === 'typescript' ? 'tsx' : 'jsx');
        const parsedCode = parseCode(code, extension);
        const hookIssues: any[] = [];
        
        // Validate each React hook usage
        for (const hook of parsedCode.reactHooks || []) {
            // Check for common hook issues
            if (hook.type === 'effect') {
                // useEffect validation
                if (hook.dependencies && hook.dependencies.length === 0) {
                    const hasStateUpdate = hook.body.includes('set') && 
                                         (hook.body.includes('State') || hook.body.includes('useState'));
                    
                    if (hasStateUpdate) {
                        hookIssues.push({
                            type: 'MISSING_DEPENDENCY',
                            hook: hook.name,
                            severity: 'HIGH',
                            message: 'useEffect with empty dependency array but contains state updates',
                            suggestion: 'Add state setters to dependency array or ensure effect should only run once'
                        });
                    }
                }
                
                // Check for missing cleanup
                if (hook.body.includes('setInterval') || hook.body.includes('setTimeout') || 
                    hook.body.includes('addEventListener')) {
                    const hasCleanup = hook.body.includes('return') && 
                                     (hook.body.includes('clear') || hook.body.includes('remove'));
                    
                    if (!hasCleanup) {
                        hookIssues.push({
                            type: 'MISSING_CLEANUP',
                            hook: hook.name,
                            severity: 'MEDIUM',
                            message: 'useEffect contains side effects but no cleanup function',
                            suggestion: 'Add cleanup function to prevent memory leaks'
                        });
                    }
                }
            }
            
            if (hook.type === 'callback' || hook.type === 'memo') {
                // useCallback/useMemo validation
                if (!hook.dependencies || hook.dependencies.length === 0) {
                    hookIssues.push({
                        type: 'UNNECESSARY_MEMOIZATION',
                        hook: hook.name,
                        severity: 'LOW',
                        message: `${hook.name} with empty dependency array - consider if memoization is necessary`,
                        suggestion: 'Remove memoization if dependencies never change, or add proper dependencies'
                    });
                }
            }
            
            // Check for custom hooks following naming convention
            if (hook.type === 'custom') {
                if (!hook.name.startsWith('use') || hook.name.length <= 3) {
                    hookIssues.push({
                        type: 'INVALID_HOOK_NAME',
                        hook: hook.name,
                        severity: 'HIGH',
                        message: 'Custom hook name must start with "use" and be descriptive',
                        suggestion: 'Rename hook to follow React hook naming convention'
                    });
                }
            }
        }
        
        // Check for hooks called conditionally (Rules of Hooks violation)
        const codeLines = code.split('\n');
        const hookCallsInConditions: any[] = [];
        
        codeLines.forEach((line, index) => {
            const hasHookCall = /use[A-Z]\w*\(/.test(line);
            const inCondition = /\s*(if|for|while|switch|&&|\|\|)\s*/.test(line) || 
                               line.trim().startsWith('if') || 
                               line.trim().startsWith('for') ||
                               line.trim().startsWith('while');
            
            if (hasHookCall && inCondition) {
                const hookMatch = line.match(/use[A-Z]\w*/);
                if (hookMatch) {
                    hookCallsInConditions.push({
                        hook: hookMatch[0],
                        line: index + 1,
                        code: line.trim()
                    });
                }
            }
        });
        
        for (const violation of hookCallsInConditions) {
            hookIssues.push({
                type: 'RULES_OF_HOOKS_VIOLATION',
                hook: violation.hook,
                severity: 'HIGH',
                message: `Hook called conditionally on line ${violation.line}`,
                suggestion: 'Move hook call to top level of component - hooks must be called in the same order every time',
                location: `Line ${violation.line}: ${violation.code}`
            });
        }
        
        // Check hooks against knowledge graph for validation
        for (const hook of parsedCode.reactHooks || []) {
            if (hook.type === 'custom') {
                const result = await session.executeRead(tx =>
                    tx.run('MATCH (h:ReactHook {name: $name, language: $language, context: $context}) RETURN h', 
                           { name: hook.name, language, context })
                );
                
                if (result.records.length === 0) {
                    hookIssues.push({
                        type: 'UNKNOWN_CUSTOM_HOOK',
                        hook: hook.name,
                        severity: 'MEDIUM',
                        message: 'Custom hook not found in knowledge graph',
                        suggestion: 'Verify custom hook is properly defined or imported'
                    });
                }
            }
        }
        
        const summary = {
            totalHooks: parsedCode.reactHooks?.length || 0,
            totalIssues: hookIssues.length,
            highSeverity: hookIssues.filter(i => i.severity === 'HIGH').length,
            mediumSeverity: hookIssues.filter(i => i.severity === 'MEDIUM').length,
            lowSeverity: hookIssues.filter(i => i.severity === 'LOW').length
        };
        
        const reportText = [
            `React Hooks Validation Report:`,
            `Total Hooks: ${summary.totalHooks}`,
            `Total Issues: ${summary.totalIssues}`,
            `High Severity: ${summary.highSeverity}`,
            `Medium Severity: ${summary.mediumSeverity}`,
            `Low Severity: ${summary.lowSeverity}`,
            ``,
            `Issues Found:`
        ].join('\n');
        
        const detailedIssues = hookIssues.map(issue => 
            `${issue.severity}: ${issue.type}
  Hook: ${issue.hook}
  Message: ${issue.message}
  Suggestion: ${issue.suggestion}${issue.location ? '\n  Location: ' + issue.location : ''}`
        ).join('\n\n');
        
        return {
            content: [{
                type: 'text',
                text: hookIssues.length > 0 
                    ? `${reportText}\n\n${detailedIssues}`
                    : `React Hooks Validation: All ${summary.totalHooks} hooks follow best practices!`
            }]
        };
    } catch (error: any) {
        console.error('Error in validateReactHooks:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to validate React hooks: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register indexDependencies tool
server.registerTool('indexDependencies', {
    title: 'Index Package Dependencies',
    description: 'Indexes known APIs and functions from package.json dependencies to improve validation accuracy.',
    inputSchema: {
        packageJsonContent: z.string().describe('Content of package.json file'),
        projectPath: z.string().optional().describe('Optional project path for context'),
        context: z.string().optional().describe('Project context/namespace (e.g., "my-app", "backend-api"). Defaults to "default".')
    }
}, async ({ packageJsonContent, projectPath, context = 'default' }) => {
    const session = driver.session();
    try {
        const dependencies = parsePackageJsonDependencies(packageJsonContent);
        let indexedLibraries = 0;
        let indexedAPIs = 0;
        const unsupportedLibraries: string[] = [];
        
        for (const libName of dependencies) {
            const api = getLibraryAPI(libName);
            if (api) {
                indexedLibraries++;
                
                // Index library node with context
                await session.executeWrite(tx =>
                    tx.run(`
                        MERGE (lib:Library {name: $name, context: $context})
                        ON CREATE SET 
                            lib.version = $version,
                            lib.indexedAt = timestamp(),
                            lib.projectPath = $projectPath
                        ON MATCH SET 
                            lib.version = $version,
                            lib.updatedAt = timestamp(),
                            lib.projectPath = $projectPath
                    `, { 
                        name: api.name,
                        version: api.version || 'unknown',
                        projectPath: projectPath || 'unknown',
                        context
                    })
                );
                
                // Index functions with context
                for (const funcName of api.functions) {
                    await session.executeWrite(tx =>
                        tx.run(`
                            MERGE (lib:Library {name: $libName, context: $context})
                            MERGE (func:LibraryFunction {name: $funcName, library: $libName, context: $context})
                            ON CREATE SET 
                                func.type = 'function',
                                func.createdAt = timestamp()
                            ON MATCH SET 
                                func.updatedAt = timestamp()
                            MERGE (lib)-[:PROVIDES]->(func)
                        `, { libName: api.name, funcName, context })
                    );
                    indexedAPIs++;
                }
                
                // Index classes with context
                for (const className of api.classes) {
                    await session.executeWrite(tx =>
                        tx.run(`
                            MERGE (lib:Library {name: $libName, context: $context})
                            MERGE (cls:LibraryClass {name: $className, library: $libName, context: $context})
                            ON CREATE SET 
                                cls.type = 'class',
                                cls.createdAt = timestamp()
                            ON MATCH SET 
                                cls.updatedAt = timestamp()
                            MERGE (lib)-[:PROVIDES]->(cls)
                        `, { libName: api.name, className, context })
                    );
                    indexedAPIs++;
                }
                
                // Index constants with context
                for (const constName of api.constants) {
                    await session.executeWrite(tx =>
                        tx.run(`
                            MERGE (lib:Library {name: $libName, context: $context})
                            MERGE (const:LibraryConstant {name: $constName, library: $libName, context: $context})
                            ON CREATE SET 
                                const.type = 'constant',
                                const.createdAt = timestamp()
                            ON MATCH SET 
                                const.updatedAt = timestamp()
                            MERGE (lib)-[:PROVIDES]->(const)
                        `, { libName: api.name, constName, context })
                    );
                    indexedAPIs++;
                }
                
                // Index hooks (React specific) with context
                if (api.hooks) {
                    for (const hookName of api.hooks) {
                        await session.executeWrite(tx =>
                            tx.run(`
                                MERGE (lib:Library {name: $libName, context: $context})
                                MERGE (hook:LibraryHook {name: $hookName, library: $libName, context: $context})
                                ON CREATE SET 
                                    hook.type = 'hook',
                                    hook.createdAt = timestamp()
                                ON MATCH SET 
                                    hook.updatedAt = timestamp()
                                MERGE (lib)-[:PROVIDES]->(hook)
                            `, { libName: api.name, hookName, context })
                        );
                        indexedAPIs++;
                    }
                }
                
                // Index types with context
                for (const typeName of api.types) {
                    await session.executeWrite(tx =>
                        tx.run(`
                            MERGE (lib:Library {name: $libName, context: $context})
                            MERGE (type:LibraryType {name: $typeName, library: $libName, context: $context})
                            ON CREATE SET 
                                type.type = 'type',
                                type.createdAt = timestamp()
                            ON MATCH SET 
                                type.updatedAt = timestamp()
                            MERGE (lib)-[:PROVIDES]->(type)
                        `, { libName: api.name, typeName, context })
                    );
                    indexedAPIs++;
                }
            } else {
                unsupportedLibraries.push(libName);
            }
        }
        
        const summary = {
            totalDependencies: dependencies.length,
            indexedLibraries,
            indexedAPIs,
            unsupportedLibraries: unsupportedLibraries.length
        };
        
        const reportText = [
            `Dependency Indexing Complete:`,
            `Total Dependencies: ${summary.totalDependencies}`,
            `Indexed Libraries: ${summary.indexedLibraries}`,
            `Indexed API Elements: ${summary.indexedAPIs}`,
            `Unsupported Libraries: ${summary.unsupportedLibraries}`,
            ``
        ].join('\n');
        
        const supportedLibs = dependencies.filter(lib => getLibraryAPI(lib));
        const supportedText = supportedLibs.length > 0 
            ? `Supported Libraries:\n${supportedLibs.map(lib => `- ${lib}`).join('\n')}\n\n`
            : '';
        
        const unsupportedText = unsupportedLibraries.length > 0 
            ? `Unsupported Libraries (APIs not in database):\n${unsupportedLibraries.map(lib => `- ${lib}`).join('\n')}`
            : '';
        
        return {
            content: [{
                type: 'text',
                text: `${reportText}${supportedText}${unsupportedText}`
            }]
        };
    } catch (error: any) {
        console.error('Error in indexDependencies:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to index dependencies: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register context management tool
server.registerTool('manageContexts', {
    title: 'Manage Project Contexts and Branches',
    description: 'List, create, or delete project contexts and branches in the Neo4j database. Supports branch-specific operations.',
    inputSchema: {
        action: z.enum(['list', 'list-branches', 'create', 'delete', 'clear', 'switch-branch', 'compare-branches']).describe('Action to perform on contexts/branches.'),
        projectContext: z.string().optional().describe('Project context name (required for some actions).'),
        branch: z.string().optional().describe('Branch name (required for branch-specific actions).'),
        targetBranch: z.string().optional().describe('Target branch for comparison (used with compare-branches).')
    }
}, async ({ action, projectContext, branch, targetBranch }) => {
    const session = driver.session();
    try {
        switch (action) {
            case 'list':
                const listResult = await session.executeRead(tx =>
                    tx.run(`
                        MATCH (n) 
                        WHERE n.context IS NOT NULL 
                        WITH DISTINCT n.context as context, 
                             count{(f:Function {context: n.context})} as functions,
                             count{(c:Class {context: n.context})} as classes,
                             count{(rc:ReactComponent {context: n.context})} as components,
                             count{(file:File {context: n.context})} as files
                        RETURN context, functions, classes, components, files
                        ORDER BY context
                    `)
                );
                
                if (listResult.records.length === 0) {
                    return {
                        content: [{
                            type: 'text',
                            text: 'No contexts found in the database.'
                        }]
                    };
                }
                
                const contexts = listResult.records.map(record => {
                    const contextStr = record.get('context');
                    const parts = contextStr.split(':');
                    return {
                        fullContext: contextStr,
                        project: parts[0] || 'unknown',
                        branch: parts[1] || 'main',
                        functions: record.get('functions').toNumber(),
                        classes: record.get('classes').toNumber(),
                        components: record.get('components').toNumber(),
                        files: record.get('files').toNumber()
                    };
                });
                
                const contextList = contexts.map(ctx => 
                    `📁 ${ctx.project} (${ctx.branch}): ${ctx.files} files, ${ctx.functions} functions, ${ctx.classes} classes, ${ctx.components} components`
                ).join('\n');
                
                return {
                    content: [{
                        type: 'text',
                        text: `Available Contexts:\n\n${contextList}\n\nTotal: ${contexts.length} contexts`
                    }]
                };

            case 'list-branches':
                if (!projectContext) {
                    throw new Error('Project context is required for list-branches action');
                }
                
                const branchResult = await session.executeRead(tx =>
                    tx.run(`
                        MATCH (n) 
                        WHERE n.context STARTS WITH $projectPrefix
                        WITH DISTINCT n.context as context, 
                             count{(f:Function {context: n.context})} as functions,
                             count{(c:Class {context: n.context})} as classes,
                             count{(rc:ReactComponent {context: n.context})} as components,
                             count{(file:File {context: n.context})} as files
                        RETURN context, functions, classes, components, files
                        ORDER BY context
                    `, { projectPrefix: `${projectContext}:` })
                );
                
                if (branchResult.records.length === 0) {
                    return {
                        content: [{
                            type: 'text',
                            text: `No branches found for project context "${projectContext}".`
                        }]
                    };
                }
                
                const branches = branchResult.records.map(record => {
                    const contextStr = record.get('context');
                    const branch = contextStr.split(':')[1] || 'main';
                    return {
                        branch,
                        functions: record.get('functions').toNumber(),
                        classes: record.get('classes').toNumber(),
                        components: record.get('components').toNumber(),
                        files: record.get('files').toNumber()
                    };
                });
                
                const branchList = branches.map(b => 
                    `🌿 ${b.branch}: ${b.files} files, ${b.functions} functions, ${b.classes} classes, ${b.components} components`
                ).join('\n');
                
                return {
                    content: [{
                        type: 'text',
                        text: `Branches in "${projectContext}":\n\n${branchList}\n\nTotal: ${branches.length} branches`
                    }]
                };
                
            case 'create':
                if (!projectContext || !branch) {
                    throw new Error('Both projectContext and branch are required for create action');
                }
                
                const fullContext = generateContext(projectContext, branch);
                
                // Check if context already exists
                const existsResult = await session.executeRead(tx =>
                    tx.run('MATCH (n {context: $context}) RETURN count(n) as count', { context: fullContext })
                );
                
                const count = existsResult.records[0].get('count').toNumber();
                if (count > 0) {
                    return {
                        content: [{
                            type: 'text',
                            text: `Context "${projectContext}:${branch}" already exists with ${count} nodes.`
                        }]
                    };
                }
                
                return {
                    content: [{
                        type: 'text',
                        text: `Context "${projectContext}:${branch}" is ready for use. Start indexing files with this context to populate it.`
                    }]
                };
                
            case 'delete':
                if (!projectContext || !branch) {
                    throw new Error('Both projectContext and branch are required for delete action');
                }
                
                const deleteContext = generateContext(projectContext, branch);
                
                const deleteResult = await session.executeWrite(tx =>
                    tx.run('MATCH (n {context: $context}) DETACH DELETE n RETURN count(n) as deleted', { context: deleteContext })
                );
                
                const deleted = deleteResult.records[0].get('deleted').toNumber();
                
                return {
                    content: [{
                        type: 'text',
                        text: `Deleted context "${projectContext}:${branch}" and ${deleted} associated nodes.`
                    }]
                };
                
            case 'clear':
                if (!projectContext || !branch) {
                    throw new Error('Both projectContext and branch are required for clear action');
                }
                
                const clearContext = generateContext(projectContext, branch);
                
                const clearResult = await session.executeWrite(tx =>
                    tx.run('MATCH (n {context: $context}) DETACH DELETE n RETURN count(n) as cleared', { context: clearContext })
                );
                
                const cleared = clearResult.records[0].get('cleared').toNumber();
                
                return {
                    content: [{
                        type: 'text',
                        text: `Cleared ${cleared} nodes from context "${projectContext}:${branch}".`
                    }]
                };

            case 'compare-branches':
                if (!projectContext || !branch || !targetBranch) {
                    throw new Error('projectContext, branch, and targetBranch are required for compare-branches action');
                }
                
                const sourceBranchContext = generateContext(projectContext, branch);
                const targetBranchContext = generateContext(projectContext, targetBranch);
                
                const compareResult = await session.executeRead(tx =>
                    tx.run(`
                        // Get functions from source branch
                        OPTIONAL MATCH (sf:Function {context: $sourceContext})
                        WITH collect({name: sf.name, type: 'Function'}) as sourceFunctions
                        
                        // Get functions from target branch
                        OPTIONAL MATCH (tf:Function {context: $targetContext})
                        WITH sourceFunctions, collect({name: tf.name, type: 'Function'}) as targetFunctions
                        
                        // Get classes from source branch
                        OPTIONAL MATCH (sc:Class {context: $sourceContext})
                        WITH sourceFunctions, targetFunctions, collect({name: sc.name, type: 'Class'}) as sourceClasses
                        
                        // Get classes from target branch
                        OPTIONAL MATCH (tc:Class {context: $targetContext})
                        WITH sourceFunctions, targetFunctions, sourceClasses, collect({name: tc.name, type: 'Class'}) as targetClasses
                        
                        RETURN sourceFunctions, targetFunctions, sourceClasses, targetClasses
                    `, { sourceContext: sourceBranchContext, targetContext: targetBranchContext })
                );
                
                const record = compareResult.records[0];
                const sourceFunctions = record.get('sourceFunctions') || [];
                const targetFunctions = record.get('targetFunctions') || [];
                const sourceClasses = record.get('sourceClasses') || [];
                const targetClasses = record.get('targetClasses') || [];
                
                const sourceElements = [...sourceFunctions, ...sourceClasses];
                const targetElements = [...targetFunctions, ...targetClasses];
                
                const sourceNames = new Set(sourceElements.map(e => e.name));
                const targetNames = new Set(targetElements.map(e => e.name));
                
                const onlyInSource = sourceElements.filter(e => !targetNames.has(e.name));
                const onlyInTarget = targetElements.filter(e => !sourceNames.has(e.name));
                const inBoth = sourceElements.filter(e => targetNames.has(e.name));
                
                let comparisonText = `Branch Comparison: ${branch} vs ${targetBranch}\n\n`;
                comparisonText += `📊 Summary:\n`;
                comparisonText += `  • ${sourceElements.length} elements in ${branch}\n`;
                comparisonText += `  • ${targetElements.length} elements in ${targetBranch}\n`;
                comparisonText += `  • ${inBoth.length} common elements\n`;
                comparisonText += `  • ${onlyInSource.length} only in ${branch}\n`;
                comparisonText += `  • ${onlyInTarget.length} only in ${targetBranch}\n\n`;
                
                if (onlyInSource.length > 0) {
                    comparisonText += `🔴 Only in ${branch}:\n`;
                    onlyInSource.forEach(e => comparisonText += `  • ${e.type}: ${e.name}\n`);
                    comparisonText += '\n';
                }
                
                if (onlyInTarget.length > 0) {
                    comparisonText += `🔵 Only in ${targetBranch}:\n`;
                    onlyInTarget.forEach(e => comparisonText += `  • ${e.type}: ${e.name}\n`);
                    comparisonText += '\n';
                }
                
                if (inBoth.length > 0) {
                    comparisonText += `✅ Common elements:\n`;
                    inBoth.forEach(e => comparisonText += `  • ${e.type}: ${e.name}\n`);
                }
                
                return {
                    content: [{
                        type: 'text',
                        text: comparisonText
                    }]
                };
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error: any) {
        console.error('Error in manageContexts:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to ${action} context: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Register analyzeRelationships tool
server.registerTool('analyzeRelationships', {
    title: 'Analyze Code Relationships',
    description: 'Analyzes and visualizes relationships between code elements (functions, classes, imports, etc.) in the knowledge graph.',
    inputSchema: {
        projectContext: z.string().optional().describe('Project context/namespace to analyze. Defaults to "default".'),
        branch: z.string().optional().describe('Git branch to analyze. Defaults to "main".'),
        analysisType: z.enum(['all', 'function-calls', 'class-inheritance', 'imports', 'dependencies']).optional().describe('Type of relationship analysis. Defaults to "all".'),
        elementName: z.string().optional().describe('Specific element name to analyze relationships for'),
        maxDepth: z.number().optional().describe('Maximum depth for relationship traversal (1-5). Defaults to 2.')
    }
}, async ({ projectContext = 'default', branch = 'main', analysisType = 'all', elementName, maxDepth = 2 }) => {
    const context = generateContext(projectContext, branch);
    const session = driver.session();
    
    try {
        let relationships: any[] = [];
        
        if (analysisType === 'all' || analysisType === 'function-calls') {
            // Analyze function call relationships
            const functionCallsResult = await session.executeRead(tx =>
                tx.run(`
                    MATCH (caller:Function {context: $context})-[:CALLS]->(called:Function {context: $context})
                    ${elementName ? 'WHERE caller.name = $elementName OR called.name = $elementName' : ''}
                    RETURN caller.name as caller, called.name as called, 'CALLS' as relationship
                `, { context, elementName })
            );
            
            relationships.push(...functionCallsResult.records.map(r => ({
                from: r.get('caller'),
                to: r.get('called'),
                type: r.get('relationship')
            })));
        }
        
        if (analysisType === 'all' || analysisType === 'class-inheritance') {
            // Analyze class inheritance relationships
            const inheritanceResult = await session.executeRead(tx =>
                tx.run(`
                    MATCH (child:Class {context: $context})-[:EXTENDS]->(parent:Class {context: $context})
                    ${elementName ? 'WHERE child.name = $elementName OR parent.name = $elementName' : ''}
                    RETURN child.name as child, parent.name as parent, 'EXTENDS' as relationship
                `, { context, elementName })
            );
            
            relationships.push(...inheritanceResult.records.map(r => ({
                from: r.get('child'),
                to: r.get('parent'),
                type: r.get('relationship')
            })));
            
            // Interface implementations
            const implementsResult = await session.executeRead(tx =>
                tx.run(`
                    MATCH (cls:Class {context: $context})-[:IMPLEMENTS]->(interface:Interface {context: $context})
                    ${elementName ? 'WHERE cls.name = $elementName OR interface.name = $elementName' : ''}
                    RETURN cls.name as class, interface.name as interface, 'IMPLEMENTS' as relationship
                `, { context, elementName })
            );
            
            relationships.push(...implementsResult.records.map(r => ({
                from: r.get('class'),
                to: r.get('interface'),
                type: r.get('relationship')
            })));
        }
        
        if (analysisType === 'all' || analysisType === 'imports') {
            // Analyze import relationships
            const importsResult = await session.executeRead(tx =>
                tx.run(`
                    MATCH (file:File {context: $context})-[rel:IMPORTS]->(module:Module {context: $context})
                    RETURN file.path as file, module.name as module, 'IMPORTS' as relationship, rel.imports as imports
                `, { context })
            );
            
            relationships.push(...importsResult.records.map(r => ({
                from: r.get('file'),
                to: r.get('module'),
                type: r.get('relationship'),
                details: r.get('imports')
            })));
        }
        
        if (analysisType === 'all' || analysisType === 'dependencies') {
            // Analyze instantiation relationships
            const instantiationResult = await session.executeRead(tx =>
                tx.run(`
                    MATCH (func:Function {context: $context})-[:INSTANTIATES]->(cls:Class {context: $context})
                    ${elementName ? 'WHERE func.name = $elementName OR cls.name = $elementName' : ''}
                    RETURN func.name as function, cls.name as class, 'INSTANTIATES' as relationship
                `, { context, elementName })
            );
            
            relationships.push(...instantiationResult.records.map(r => ({
                from: r.get('function'),
                to: r.get('class'),
                type: r.get('relationship')
            })));
        }
        
        // Get summary statistics
        const summaryResult = await session.executeRead(tx =>
            tx.run(`
                MATCH (n {context: $context})
                WITH labels(n)[0] as nodeType, count(n) as count
                RETURN nodeType, count
                ORDER BY count DESC
            `, { context })
        );
        
        const summary = summaryResult.records.map(r => ({
            type: r.get('nodeType'),
            count: r.get('count').toNumber()
        }));
        
        // Find orphaned elements (no relationships)
        const orphanedResult = await session.executeRead(tx =>
            tx.run(`
                MATCH (n {context: $context})
                WHERE NOT (n)--()
                RETURN labels(n)[0] as type, n.name as name
                LIMIT 10
            `, { context })
        );
        
        const orphaned = orphanedResult.records.map(r => ({
            type: r.get('type'),
            name: r.get('name')
        }));
        
        // Generate relationship report
        const relationshipsByType = relationships.reduce((acc, rel) => {
            acc[rel.type] = (acc[rel.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const report = [
            `🔗 Code Relationship Analysis for ${projectContext}:${branch}`,
            ``,
            `📊 Summary:`,
            ...summary.map(s => `  ${s.type}: ${s.count} nodes`),
            ``,
            `🔄 Relationships Found:`,
            ...Object.entries(relationshipsByType).map(([type, count]) => `  ${type}: ${count} relationships`),
            ``,
            `🔗 Relationship Details:`
        ];
        
        if (relationships.length > 0) {
            const relationshipDetails = relationships.slice(0, 20).map(rel => {
                const details = rel.details ? ` (${Array.isArray(rel.details) ? rel.details.join(', ') : rel.details})` : '';
                return `  ${rel.from} --[${rel.type}]--> ${rel.to}${details}`;
            });
            
            report.push(...relationshipDetails);
            
            if (relationships.length > 20) {
                report.push(`  ... and ${relationships.length - 20} more relationships`);
            }
        } else {
            report.push('  No relationships found');
        }
        
        if (orphaned.length > 0) {
            report.push(``, `🏝️ Orphaned Elements (no relationships):`);
            report.push(...orphaned.map(o => `  ${o.type}: ${o.name}`));
        }
        
        return {
            content: [{
                type: 'text',
                text: report.join('\n')
            }]
        };
        
    } catch (error: any) {
        console.error('Error in analyzeRelationships:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to analyze relationships: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Helper function to calculate text similarity
function calculateSimilarity(str1: string, str2: string): number {
    const tokens1 = str1.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    const tokens2 = str2.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    
    const intersection = tokens1.filter(token => tokens2.includes(token));
    const union = [...new Set([...tokens1, ...tokens2])];
    
    return intersection.length / union.length;
}

// Register comprehensive JavaScript/TypeScript hallucination detection tool
server.registerTool('detectJSHallucinations', {
    title: 'Detect JavaScript/TypeScript Hallucinations',
    description: 'Comprehensive hallucination detection for JavaScript/TypeScript code including npm packages, native APIs, React hooks, Vue composables, and Node.js patterns.',
    inputSchema: {
        code: z.string().describe('The JavaScript/TypeScript code to analyze for hallucinations.'),
        checkPackages: z.boolean().optional().describe('Verify npm package existence (default: true)'),
        packageNames: z.array(z.string()).optional().describe('Specific package names to verify. Auto-extracted if not provided.'),
        checkJSAPIs: z.boolean().optional().describe('Validate JavaScript native APIs (default: true)'),
        environment: z.enum(['browser', 'node', 'both']).optional().describe('Target environment for API validation (default: both)'),
        esVersion: z.string().optional().describe('ECMAScript version (e.g., "ES2020")'),
        detectReact: z.boolean().optional().describe('Enable React-specific detection (default: auto-detect)'),
        reactVersion: z.string().optional().describe('React version for validation'),
        detectVue: z.boolean().optional().describe('Enable Vue.js-specific detection (default: auto-detect)'),
        vueVersion: z.enum(['2', '3']).optional().describe('Vue.js version for validation (default: 3)'),
        detectNodeJS: z.boolean().optional().describe('Enable Node.js-specific detection (default: auto-detect)'),
        nodeVersion: z.string().optional().describe('Node.js version for validation'),
        framework: z.enum(['express', 'fastify', 'koa', 'nest']).optional().describe('Backend framework for specific validations'),
        typescript: z.boolean().optional().describe('Enable TypeScript-specific validations (default: false)'),
        strictMode: z.boolean().optional().describe('Enable strict validation mode (default: false)')
    }
}, async ({ 
    code, 
    checkPackages = true, 
    packageNames, 
    checkJSAPIs = true, 
    environment = 'both',
    esVersion,
    detectReact,
    reactVersion,
    detectVue,
    vueVersion = '3',
    detectNodeJS,
    nodeVersion,
    framework,
    typescript = false,
    strictMode = false 
}) => {
    try {
        const result = await detectJSHallucinations(code, {
            checkPackages,
            packageNames,
            checkJSAPIs,
            environment,
            esVersion,
            detectReact,
            reactVersion,
            detectVue,
            vueVersion,
            detectNodeJS,
            nodeVersion,
            framework,
            typescript,
            strictMode
        });

        const summary = [
            `🔍 JavaScript/TypeScript Hallucination Analysis`,
            ``,
            `📊 Overall Results:`,
            `  Valid: ${result.overall.valid ? '✅' : '❌'}`,
            `  Confidence: ${result.overall.confidence.toFixed(1)}%`,
            `  Risk Score: ${result.overall.riskScore.toFixed(1)}/100`,
            ``,
            `📈 Summary:`,
            `  Total Issues: ${result.summary.totalIssues}`,
            `  Critical Issues: ${result.summary.criticalIssues}`,
            ``
        ];

        // Add package results
        if (result.packages) {
            summary.push(
                `📦 Package Analysis:`,
                `  Total Packages: ${result.packages.summary.total}`,
                `  Existing: ${result.packages.summary.existing}`,
                `  Hallucinated: ${result.packages.summary.hallucinated}`,
                `  Suspicious: ${result.packages.summary.suspicious}`,
                ``
            );

            if (result.packages.summary.hallucinated > 0) {
                const hallucinatedPkgs = result.packages.packages
                    .filter(p => !p.exists)
                    .map(p => `    ❌ ${p.name}${p.alternatives?.length ? ` → Suggested: ${p.alternatives.join(', ')}` : ''}`)
                    .join('\n');
                summary.push(`  Hallucinated Packages:\n${hallucinatedPkgs}`, ``);
            }
        }

        // Add JavaScript API results
        if (result.jsAPIs && result.jsAPIs.issues.length > 0) {
            summary.push(
                `🔧 JavaScript API Issues:`,
                ...result.jsAPIs.issues.map(issue => 
                    `  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.message}${issue.suggestion ? ` → ${issue.suggestion}` : ''}`
                ),
                ``
            );
        }

        // Add React results
        if (result.react && result.react.issues.length > 0) {
            summary.push(
                `⚛️ React Issues:`,
                ...result.react.issues.map(issue => 
                    `  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.message}${issue.suggestion ? ` → ${issue.suggestion}` : ''}`
                ),
                ``
            );
        }

        // Add Vue results
        if (result.vue && result.vue.issues.length > 0) {
            summary.push(
                `🟢 Vue.js Issues:`,
                ...result.vue.issues.map(issue => 
                    `  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.message}${issue.suggestion ? ` → ${issue.suggestion}` : ''}`
                ),
                ``
            );
        }

        // Add Node.js results
        if (result.nodejs && result.nodejs.issues.length > 0) {
            summary.push(
                `🟢 Node.js Issues:`,
                ...result.nodejs.issues.map(issue => 
                    `  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.message}${issue.suggestion ? ` → ${issue.suggestion}` : ''}`
                ),
                ``
            );
        }

        // Add recommendations
        if (result.summary.suggestions.length > 0) {
            summary.push(
                `💡 Recommendations:`,
                ...result.summary.suggestions.slice(0, 5).map(suggestion => `  • ${suggestion}`),
                result.summary.suggestions.length > 5 ? `  ... and ${result.summary.suggestions.length - 5} more` : '',
                ``
            );
        }

        return {
            content: [{
                type: 'text',
                text: summary.join('\n')
            }]
        };

    } catch (error: any) {
        console.error('Error in detectJSHallucinations:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to analyze JavaScript hallucinations: ${error.message}`
            }],
            isError: true
        };
    }
});

// Register quick JavaScript validation tool
server.registerTool('quickValidateJS', {
    title: 'Quick JavaScript Validation',
    description: 'Fast validation for obvious JavaScript/TypeScript hallucinations using pattern matching.',
    inputSchema: {
        code: z.string().describe('The JavaScript/TypeScript code to quickly validate.')
    }
}, async ({ code }) => {
    try {
        const result = quickValidateJS(code);

        const summary = [
            `⚡ Quick JavaScript Validation`,
            ``,
            `Result: ${result.valid ? '✅ Valid' : '❌ Issues Found'}`,
            `Confidence: ${result.confidence}%`,
            ``
        ];

        if (result.issues.length > 0) {
            summary.push(
                `🔍 Issues Found:`,
                ...result.issues.map(issue => `  ❌ ${issue}`),
                ``
            );
        }

        return {
            content: [{
                type: 'text',
                text: summary.join('\n')
            }]
        };

    } catch (error: any) {
        console.error('Error in quickValidateJS:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to quick validate JavaScript: ${error.message}`
            }],
            isError: true
        };
    }
});

// Register npm package verification tool
server.registerTool('verifyNpmPackages', {
    title: 'Verify NPM Packages',
    description: 'Verify the existence and security of npm packages, detect typosquatting and hallucinated packages.',
    inputSchema: {
        packages: z.array(z.string()).describe('Array of package names to verify'),
        detectTyposquatting: z.boolean().optional().describe('Check for common typos and typosquatting (default: true)')
    }
}, async ({ packages, detectTyposquatting = true }) => {
    try {
        const result = await npmVerifier.verifyPackages(packages);

        const summary = [
            `📦 NPM Package Verification`,
            ``,
            `📊 Summary:`,
            `  Total Packages: ${result.summary.total}`,
            `  Existing: ${result.summary.existing}`,
            `  Hallucinated: ${result.summary.hallucinated}`,
            `  Suspicious: ${result.summary.suspicious}`,
            ``
        ];

        // Add detailed package results
        for (const pkg of result.packages) {
            const status = pkg.exists ? '✅' : '❌';
            const risk = pkg.security.riskScore > 50 ? ` (Risk: ${pkg.security.riskScore})` : '';
            
            summary.push(`${status} ${pkg.name}${risk}`);
            
            if (!pkg.exists && pkg.alternatives?.length) {
                summary.push(`    💡 Alternatives: ${pkg.alternatives.join(', ')}`);
            }
            
            if (pkg.exists && pkg.metadata) {
                summary.push(`    📈 Downloads: ${pkg.metadata.weeklyDownloads.toLocaleString()}/week`);
                if (pkg.metadata.deprecated) {
                    summary.push(`    ⚠️ DEPRECATED`);
                }
            }
        }

        if (result.recommendations.length > 0) {
            summary.push(
                ``,
                `💡 Recommendations:`,
                ...result.recommendations.map(rec => `  • ${rec}`)
            );
        }

        return {
            content: [{
                type: 'text',
                text: summary.join('\n')
            }]
        };

    } catch (error: any) {
        console.error('Error in verifyNpmPackages:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to verify npm packages: ${error.message}`
            }],
            isError: true
        };
    }
});

// HTML Coherence Validation Tool
server.registerTool('validateHTML', {
    title: 'HTML/JSX Coherence Validator',
    description: 'Validates HTML element structure, attributes, semantic coherence, and accessibility',
    inputSchema: {
        html: z.string().describe('HTML or JSX content to validate'),
        isJSX: z.boolean().optional().describe('Whether the content is JSX (default: false)'),
        filePath: z.string().optional().describe('Optional file path for context')
    }
}, async ({ html, isJSX = false, filePath }) => {
    try {
        const validator = new HTMLCoherenceValidator();
        const result = validator.validateHTML(html, isJSX);
        
        const errorCount = result.errors.length;
        const warningCount = result.warnings.length;
        const suggestionCount = result.suggestions.length;
        
        let responseText = `🔍 HTML/JSX Validation Results${filePath ? ` for ${filePath}` : ''}:\n\n`;
        responseText += `📊 **Summary:**\n`;
        responseText += `- Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}\n`;
        responseText += `- Score: ${result.score}/100\n`;
        responseText += `- Errors: ${errorCount}\n`;
        responseText += `- Warnings: ${warningCount}\n`;
        responseText += `- Suggestions: ${suggestionCount}\n\n`;
        
        if (errorCount > 0) {
            responseText += `🚨 **Errors:**\n`;
            result.errors.forEach((error, index) => {
                responseText += `${index + 1}. [${error.type.toUpperCase()}] Line ${error.line}: ${error.message}\n`;
                if (error.element) responseText += `   Element: <${error.element}>\n`;
            });
            responseText += '\n';
        }
        
        if (warningCount > 0) {
            responseText += `⚠️ **Warnings:**\n`;
            result.warnings.forEach((warning, index) => {
                responseText += `${index + 1}. [${warning.type.toUpperCase()}] Line ${warning.line}: ${warning.message}\n`;
                if (warning.element) responseText += `   Element: <${warning.element}>\n`;
            });
            responseText += '\n';
        }
        
        if (suggestionCount > 0) {
            responseText += `💡 **Suggestions:**\n`;
            result.suggestions.forEach((suggestion, index) => {
                responseText += `${index + 1}. ${suggestion}\n`;
            });
            responseText += '\n';
        }
        
        if (result.isValid && errorCount === 0 && warningCount === 0) {
            responseText += `✨ **Excellent!** Your HTML/JSX follows best practices.\n`;
        }
        
        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    } catch (error: any) {
        console.error('Error in validateHTML:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to validate HTML: ${error.message}`
            }],
            isError: true
        };
    }
});

// CSS Validation Tool
server.registerTool('validateCSS', {
    title: 'CSS Validator',
    description: 'Validates CSS syntax, properties, coherence, performance, and maintainability',
    inputSchema: {
        css: z.string().describe('CSS content to validate'),
        isStyled: z.boolean().optional().describe('Whether the CSS is from styled-components (default: false)'),
        filePath: z.string().optional().describe('Optional file path for context')
    }
}, async ({ css, isStyled = false, filePath }) => {
    try {
        const validator = new CSSValidator();
        const result = validator.validateCSS(css, isStyled);
        
        const errorCount = result.errors.length;
        const warningCount = result.warnings.length;
        const suggestionCount = result.suggestions.length;
        
        let responseText = `🎨 CSS Validation Results${filePath ? ` for ${filePath}` : ''}:\n\n`;
        responseText += `📊 **Summary:**\n`;
        responseText += `- Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}\n`;
        responseText += `- Score: ${result.score}/100\n`;
        responseText += `- Errors: ${errorCount}\n`;
        responseText += `- Warnings: ${warningCount}\n`;
        responseText += `- Suggestions: ${suggestionCount}\n\n`;
        
        responseText += `📈 **Metrics:**\n`;
        responseText += `- Total Rules: ${result.metrics.totalRules}\n`;
        responseText += `- Total Declarations: ${result.metrics.totalDeclarations}\n`;
        responseText += `- Average Specificity: ${result.metrics.specificity.average.toFixed(1)}\n`;
        responseText += `- Max Specificity: ${result.metrics.specificity.max}\n`;
        responseText += `- Expensive Selectors: ${result.metrics.performance.expensiveSelectors}\n`;
        responseText += `- Redundant Declarations: ${result.metrics.performance.redundantDeclarations}\n`;
        responseText += `- Magic Numbers: ${result.metrics.maintainability.magicNumbers}\n`;
        responseText += `- Hardcoded Colors: ${result.metrics.maintainability.hardcodedColors}\n\n`;
        
        if (errorCount > 0) {
            responseText += `🚨 **Errors:**\n`;
            result.errors.forEach((error, index) => {
                responseText += `${index + 1}. [${error.type.toUpperCase()}] Line ${error.line}: ${error.message}\n`;
                if (error.property) responseText += `   Property: ${error.property}\n`;
                if (error.selector) responseText += `   Selector: ${error.selector}\n`;
            });
            responseText += '\n';
        }
        
        if (warningCount > 0) {
            responseText += `⚠️ **Warnings:**\n`;
            result.warnings.forEach((warning, index) => {
                responseText += `${index + 1}. [${warning.type.toUpperCase()}] Line ${warning.line}: ${warning.message}\n`;
                if (warning.property) responseText += `   Property: ${warning.property}\n`;
                if (warning.selector) responseText += `   Selector: ${warning.selector}\n`;
            });
            responseText += '\n';
        }
        
        if (suggestionCount > 0) {
            responseText += `💡 **Suggestions:**\n`;
            result.suggestions.forEach((suggestion, index) => {
                responseText += `${index + 1}. ${suggestion}\n`;
            });
            responseText += '\n';
        }
        
        if (result.isValid && errorCount === 0 && warningCount === 0) {
            responseText += `✨ **Excellent!** Your CSS follows best practices.\n`;
        }
        
        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    } catch (error: any) {
        console.error('Error in validateCSS:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to validate CSS: ${error.message}`
            }],
            isError: true
        };
    }
});

// HTML/CSS Query Tool
server.registerTool('queryHTMLCSS', {
    title: 'Query HTML/CSS Elements',
    description: 'Query indexed HTML elements and CSS rules with relationship analysis',
    inputSchema: {
        queryType: z.enum(['html-elements', 'css-rules', 'style-relationships', 'unused-styles', 'element-styles']).describe('Type of query to perform'),
        selector: z.string().optional().describe('CSS selector or HTML tag to filter (e.g., ".button", "div", "#header")'),
        filePath: z.string().optional().describe('Filter by specific file path'),
        projectContext: z.string().optional().describe('Project context (default: "default")'),
        branch: z.string().optional().describe('Git branch (default: "main")'),
        limit: z.number().optional().describe('Maximum number of results (default: 50)')
    }
}, async ({ queryType, selector, filePath, projectContext = 'default', branch = 'main', limit = 50 }) => {
    const session = driver.session();
    const context = `${projectContext}:${branch}`;

    try {
        let query = '';
        let params: any = { context, limit };

        switch (queryType) {
            case 'html-elements':
                query = `
                    MATCH (element:HTMLElement {context: $context})
                    ${selector ? 'WHERE element.tag = $selector OR $selector IN element.classes' : ''}
                    ${filePath ? 'AND element.filePath = $filePath' : ''}
                    RETURN element.tag, element.attributes, element.classes, element.filePath, element.line
                    ORDER BY element.filePath, element.line
                    LIMIT $limit
                `;
                if (selector) params.selector = selector.replace('.', '').replace('#', '');
                if (filePath) params.filePath = filePath;
                break;

            case 'css-rules':
                query = `
                    MATCH (rule:CSSRule {context: $context})
                    ${selector ? 'WHERE rule.selector CONTAINS $selector' : ''}
                    ${filePath ? 'AND rule.filePath = $filePath' : ''}
                    OPTIONAL MATCH (rule)-[:HAS_DECLARATION]->(decl:CSSDeclaration)
                    RETURN rule.selector, rule.specificity, rule.filePath, rule.line, 
                           collect({property: decl.property, value: decl.value, important: decl.important}) as declarations
                    ORDER BY rule.specificity DESC, rule.filePath, rule.line
                    LIMIT $limit
                `;
                if (selector) params.selector = selector;
                if (filePath) params.filePath = filePath;
                break;

            case 'style-relationships':
                query = `
                    MATCH (element:HTMLElement {context: $context})-[rel:STYLED_BY]->(rule:CSSRule {context: $context})
                    ${selector ? 'WHERE element.tag = $selector OR $selector IN element.classes OR rule.selector CONTAINS $selector' : ''}
                    RETURN element.tag, element.classes, element.filePath as htmlFile, element.line as htmlLine,
                           rule.selector, rule.filePath as cssFile, rule.line as cssLine, rel.className
                    ORDER BY element.filePath, element.line
                    LIMIT $limit
                `;
                if (selector) params.selector = selector.replace('.', '').replace('#', '');
                break;

            case 'unused-styles':
                query = `
                    MATCH (rule:CSSRule {context: $context})
                    WHERE NOT (rule)<-[:STYLED_BY]-(:HTMLElement)
                    ${filePath ? 'AND rule.filePath = $filePath' : ''}
                    OPTIONAL MATCH (rule)-[:HAS_DECLARATION]->(decl:CSSDeclaration)
                    RETURN rule.selector, rule.filePath, rule.line,
                           collect({property: decl.property, value: decl.value}) as declarations
                    ORDER BY rule.filePath, rule.line
                    LIMIT $limit
                `;
                if (filePath) params.filePath = filePath;
                break;

            case 'element-styles':
                query = `
                    MATCH (element:HTMLElement {context: $context})
                    ${selector ? 'WHERE element.tag = $selector OR $selector IN element.classes' : ''}
                    OPTIONAL MATCH (element)-[:STYLED_BY]->(rule:CSSRule)
                    OPTIONAL MATCH (rule)-[:HAS_DECLARATION]->(decl:CSSDeclaration)
                    RETURN element.tag, element.classes, element.filePath, element.line, element.inlineStyles,
                           collect(DISTINCT rule.selector) as cssSelectors,
                           collect({property: decl.property, value: decl.value}) as cssDeclarations
                    ORDER BY element.filePath, element.line
                    LIMIT $limit
                `;
                if (selector) params.selector = selector.replace('.', '').replace('#', '');
                break;
        }

        const result = await session.executeRead(tx => tx.run(query, params));
        const records = result.records;

        if (records.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `No ${queryType.replace('-', ' ')} found matching the criteria.`
                }]
            };
        }

        let responseText = `🔍 **${queryType.replace('-', ' ').toUpperCase()} Query Results** (${records.length} items):\n\n`;

        records.forEach((record, index) => {
            responseText += `**${index + 1}.** `;
            
            switch (queryType) {
                case 'html-elements':
                    const tag = record.get('element.tag');
                    const attributes = record.get('element.attributes');
                    const classes = record.get('element.classes') || [];
                    const htmlFilePath = record.get('element.filePath');
                    const line = record.get('element.line');
                    
                    responseText += `<${tag}${classes.length ? ` class="${classes.join(' ')}"` : ''}\n`;
                    responseText += `   📍 ${htmlFilePath}:${line}\n`;
                    if (attributes && attributes !== '{}') {
                        responseText += `   🏷️  Attributes: ${attributes}\n`;
                    }
                    break;

                case 'css-rules':
                    const selector = record.get('rule.selector');
                    const specificity = record.get('rule.specificity');
                    const cssFilePath = record.get('rule.filePath');
                    const cssLine = record.get('rule.line');
                    const declarations = record.get('declarations') || [];
                    
                    responseText += `${selector} (specificity: ${specificity})\n`;
                    responseText += `   📍 ${cssFilePath}:${cssLine}\n`;
                    if (declarations.length > 0) {
                        responseText += `   🎨 Declarations: ${declarations.map((d: any) => `${d.property}: ${d.value}${d.important ? ' !important' : ''}`).join('; ')}\n`;
                    }
                    break;

                case 'style-relationships':
                    const elementTag = record.get('element.tag');
                    const elementClasses = record.get('element.classes') || [];
                    const htmlFile = record.get('htmlFile');
                    const htmlLineDotd = record.get('htmlLine');
                    const ruleSelector = record.get('rule.selector');
                    const cssFile = record.get('cssFile');
                    const cssLinenum = record.get('cssLine');
                    const className = record.get('rel.className');
                    
                    responseText += `<${elementTag}> ↔ ${ruleSelector}\n`;
                    responseText += `   📍 HTML: ${htmlFile}:${htmlLineDotd}\n`;
                    responseText += `   🎨 CSS: ${cssFile}:${cssLinenum}\n`;
                    if (className) responseText += `   🔗 Via: ${className}\n`;
                    break;

                case 'unused-styles':
                    const unusedSelector = record.get('rule.selector');
                    const unusedFile = record.get('rule.filePath');
                    const unusedLine = record.get('rule.line');
                    const unusedDeclarations = record.get('declarations') || [];
                    
                    responseText += `${unusedSelector} (unused)\n`;
                    responseText += `   📍 ${unusedFile}:${unusedLine}\n`;
                    if (unusedDeclarations.length > 0) {
                        responseText += `   🎨 ${unusedDeclarations.map((d: any) => `${d.property}: ${d.value}`).join('; ')}\n`;
                    }
                    break;

                case 'element-styles':
                    const elemTag = record.get('element.tag');
                    const elemClasses = record.get('element.classes') || [];
                    const elemFile = record.get('element.filePath');
                    const elemLine = record.get('element.line');
                    const inlineStyles = record.get('element.inlineStyles');
                    const cssSelectors = record.get('cssSelectors') || [];
                    const cssDecls = record.get('cssDeclarations') || [];
                    
                    responseText += `<${elemTag}${elemClasses.length ? ` class="${elemClasses.join(' ')}"` : ''}>\n`;
                    responseText += `   📍 ${elemFile}:${elemLine}\n`;
                    if (inlineStyles) responseText += `   🎨 Inline: ${inlineStyles}\n`;
                    if (cssSelectors.length > 0) responseText += `   🎯 CSS Rules: ${cssSelectors.join(', ')}\n`;
                    break;
            }
            
            responseText += '\n';
        });

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };

    } catch (error: any) {
        console.error('Error in queryHTMLCSS:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to query HTML/CSS: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Tailwind CSS Validation Tool
server.registerTool('validateTailwind', {
    title: 'Tailwind CSS Validator',
    description: 'Validates Tailwind CSS utility classes, detects invalid classes, deprecated patterns, and provides suggestions',
    inputSchema: {
        classNames: z.string().describe('Tailwind CSS class names to validate (space or comma separated)'),
        filePath: z.string().optional().describe('Optional file path for context')
    }
}, async ({ classNames, filePath }) => {
    try {
        const validator = new TailwindValidator();
        const result = validator.validateTailwindClasses(classNames, filePath || '');
        
        const errorCount = result.errors.length;
        const warningCount = result.warnings.length;
        const suggestionCount = result.suggestions.length;
        
        let responseText = `🎨 Tailwind CSS Validation Results${filePath ? ` for ${filePath}` : ''}:\n\n`;
        responseText += `📊 **Summary:**\n`;
        responseText += `- Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}\n`;
        responseText += `- Score: ${result.score}/100\n`;
        responseText += `- Errors: ${errorCount}\n`;
        responseText += `- Warnings: ${warningCount}\n`;
        responseText += `- Suggestions: ${suggestionCount}\n\n`;
        
        responseText += `📈 **Metrics:**\n`;
        responseText += `- Total Classes: ${result.metrics.totalClasses}\n`;
        responseText += `- Valid Classes: ${result.metrics.validClasses}\n`;
        responseText += `- Invalid Classes: ${result.metrics.invalidClasses}\n`;
        responseText += `- Arbitrary Values: ${result.metrics.arbitraryValues}\n`;
        responseText += `- Custom Classes: ${result.metrics.customClasses}\n`;
        responseText += `- Responsive Classes: ${result.metrics.responsiveClasses}\n`;
        responseText += `- State Classes: ${result.metrics.stateClasses}\n`;
        responseText += `- Duplicate Classes: ${result.metrics.duplicateClasses}\n`;
        responseText += `- Deprecated Classes: ${result.metrics.deprecatedClasses}\n\n`;
        
        if (errorCount > 0) {
            responseText += `🚨 **Errors:**\n`;
            result.errors.forEach((error, index) => {
                responseText += `${index + 1}. [${error.type.toUpperCase()}] Line ${error.line}: ${error.message}\n`;
                if (error.className) responseText += `   Class: ${error.className}\n`;
            });
            responseText += '\n';
        }
        
        if (warningCount > 0) {
            responseText += `⚠️ **Warnings:**\n`;
            result.warnings.forEach((warning, index) => {
                responseText += `${index + 1}. [${warning.type.toUpperCase()}] Line ${warning.line}: ${warning.message}\n`;
                if (warning.className) responseText += `   Class: ${warning.className}\n`;
            });
            responseText += '\n';
        }
        
        if (suggestionCount > 0) {
            responseText += `💡 **Suggestions:**\n`;
            result.suggestions.forEach((suggestion, index) => {
                responseText += `${index + 1}. ${suggestion}\n`;
            });
            responseText += '\n';
        }
        
        if (result.isValid && errorCount === 0 && warningCount === 0) {
            responseText += `✨ **Excellent!** Your Tailwind classes are valid and follow best practices.\n`;
        }
        
        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    } catch (error: any) {
        console.error('Error in validateTailwind:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to validate Tailwind CSS: ${error.message}`
            }],
            isError: true
        };
    }
});

// Index HTML/CSS/Tailwind Tool
server.registerTool('indexHTMLCSS', {
    title: 'Index HTML/CSS/Tailwind Content',
    description: 'Index HTML elements, CSS rules, and Tailwind classes in Neo4j database with relationship analysis',
    inputSchema: {
        content: z.string().describe('HTML or CSS content to index'),
        contentType: z.enum(['html', 'css', 'jsx', 'styled-components']).describe('Type of content being indexed'),
        filePath: z.string().describe('File path for the content'),
        projectContext: z.string().optional().describe('Project context (default: "default")'),
        branch: z.string().optional().describe('Git branch (default: "main")')
    }
}, async ({ content, contentType, filePath, projectContext = 'default', branch = 'main' }) => {
    const session = driver.session();
    try {
        const indexer = new HTMLCSSIndexer();
        let result;
        
        switch (contentType) {
            case 'html':
            case 'jsx':
                result = await indexer.indexHTML(session, content, filePath, projectContext, branch, contentType === 'jsx');
                break;
            case 'css':
            case 'styled-components':
                result = await indexer.indexCSS(session, content, filePath, projectContext, branch, contentType === 'styled-components');
                break;
            default:
                throw new Error(`Unsupported content type: ${contentType}`);
        }
        
        let responseText = `📚 HTML/CSS/Tailwind Indexing Results for ${filePath}:\n\n`;
        responseText += `📊 **Summary:**\n`;
        responseText += `- HTML Elements: ${result.htmlElements}\n`;
        responseText += `- CSS Rules: ${result.cssRules}\n`;
        responseText += `- CSS Declarations: ${result.cssDeclarations}\n`;
        responseText += `- Tailwind Classes: ${result.tailwindClasses}\n`;
        responseText += `- Relationships: ${result.relationships}\n`;
        responseText += `- Errors: ${result.errors.length}\n\n`;
        
        if (result.errors.length > 0) {
            responseText += `🚨 **Errors:**\n`;
            result.errors.forEach((error, index) => {
                responseText += `${index + 1}. ${error}\n`;
            });
            responseText += '\n';
        }
        
        responseText += `✅ **Indexing completed successfully!**\n`;
        responseText += `Project: ${projectContext}, Branch: ${branch}\n`;
        
        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    } catch (error: any) {
        console.error('Error in indexHTMLCSS:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to index HTML/CSS content: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Query Tailwind Classes Tool
server.registerTool('queryTailwindClasses', {
    title: 'Query Tailwind Classes',
    description: 'Query indexed Tailwind classes with filtering and analysis capabilities',
    inputSchema: {
        queryType: z.enum(['all-classes', 'invalid-classes', 'deprecated-classes', 'arbitrary-values', 'responsive-classes', 'state-classes', 'class-usage']).describe('Type of Tailwind query to perform'),
        className: z.string().optional().describe('Specific class name to search for'),
        filePath: z.string().optional().describe('Filter by specific file path'),
        projectContext: z.string().optional().describe('Project context (default: "default")'),
        branch: z.string().optional().describe('Git branch (default: "main")'),
        limit: z.number().optional().describe('Maximum number of results (default: 50)')
    }
}, async ({ queryType, className, filePath, projectContext = 'default', branch = 'main', limit = 50 }) => {
    const session = driver.session();
    const context = `${projectContext}:${branch}`;

    try {
        let query = '';
        let params: any = { context, limit };

        switch (queryType) {
            case 'all-classes':
                query = `
                    MATCH (twClass:TailwindClass {context: $context})
                    ${className ? 'WHERE twClass.className CONTAINS $className' : ''}
                    ${filePath ? 'AND twClass.filePath = $filePath' : ''}
                    RETURN twClass.className, twClass.filePath, twClass.isTailwind, 
                           twClass.isValid, twClass.isArbitrary, twClass.isResponsive, 
                           twClass.hasStateModifier
                    ORDER BY twClass.className
                    LIMIT $limit
                `;
                break;

            case 'invalid-classes':
                query = `
                    MATCH (twClass:TailwindClass {context: $context, isValid: false})
                    ${filePath ? 'WHERE twClass.filePath = $filePath' : ''}
                    RETURN twClass.className, twClass.filePath, twClass.isTailwind,
                           twClass.isArbitrary, twClass.isResponsive, twClass.hasStateModifier
                    ORDER BY twClass.filePath, twClass.className
                    LIMIT $limit
                `;
                break;

            case 'arbitrary-values':
                query = `
                    MATCH (twClass:TailwindClass {context: $context, isArbitrary: true})
                    ${filePath ? 'WHERE twClass.filePath = $filePath' : ''}
                    RETURN twClass.className, twClass.filePath, twClass.isValid
                    ORDER BY twClass.filePath, twClass.className
                    LIMIT $limit
                `;
                break;

            case 'responsive-classes':
                query = `
                    MATCH (twClass:TailwindClass {context: $context, isResponsive: true})
                    ${filePath ? 'WHERE twClass.filePath = $filePath' : ''}
                    RETURN twClass.className, twClass.filePath, twClass.isValid
                    ORDER BY twClass.filePath, twClass.className
                    LIMIT $limit
                `;
                break;

            case 'state-classes':
                query = `
                    MATCH (twClass:TailwindClass {context: $context, hasStateModifier: true})
                    ${filePath ? 'WHERE twClass.filePath = $filePath' : ''}
                    RETURN twClass.className, twClass.filePath, twClass.isValid
                    ORDER BY twClass.filePath, twClass.className
                    LIMIT $limit
                `;
                break;

            case 'class-usage':
                query = `
                    MATCH (twClass:TailwindClass {context: $context})<-[:USES_TAILWIND_CLASS]-(element:HTMLElement)
                    ${className ? 'WHERE twClass.className = $className' : ''}
                    ${filePath ? 'AND element.filePath = $filePath' : ''}
                    RETURN twClass.className, element.tag, element.filePath, element.line,
                           count(*) as usageCount
                    ORDER BY usageCount DESC, twClass.className
                    LIMIT $limit
                `;
                break;
        }

        if (className) params.className = className;
        if (filePath) params.filePath = filePath;

        const result = await session.executeRead(tx => tx.run(query, params));
        const records = result.records;

        if (records.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `No ${queryType.replace('-', ' ')} found matching the criteria.`
                }]
            };
        }

        let responseText = `🎨 **${queryType.replace('-', ' ').toUpperCase()} Query Results** (${records.length} items):\n\n`;

        records.forEach((record, index) => {
            responseText += `**${index + 1}.** `;
            
            const classNameValue = record.get('twClass.className');
            const filePathValue = record.get('twClass.filePath') || record.get('element.filePath');
            
            switch (queryType) {
                case 'all-classes':
                case 'invalid-classes':
                case 'arbitrary-values':
                case 'responsive-classes':
                case 'state-classes':
                    const isValid = record.get('twClass.isValid');
                    const isTailwind = record.get('twClass.isTailwind');
                    const isArbitrary = record.get('twClass.isArbitrary');
                    const isResponsive = record.get('twClass.isResponsive');
                    const hasStateModifier = record.get('twClass.hasStateModifier');
                    
                    responseText += `${classNameValue} ${isValid ? '✅' : '❌'}\n`;
                    responseText += `   📍 ${filePathValue}\n`;
                    
                    const attributes = [];
                    if (isTailwind) attributes.push('Tailwind');
                    if (isArbitrary) attributes.push('Arbitrary');
                    if (isResponsive) attributes.push('Responsive');
                    if (hasStateModifier) attributes.push('State');
                    
                    if (attributes.length > 0) {
                        responseText += `   🏷️  ${attributes.join(', ')}\n`;
                    }
                    break;

                case 'class-usage':
                    const elementTag = record.get('element.tag');
                    const elementLine = record.get('element.line');
                    const usageCount = record.get('usageCount').toNumber();
                    
                    responseText += `${classNameValue} (used ${usageCount} times)\n`;
                    responseText += `   📍 ${filePathValue}:${elementLine}\n`;
                    responseText += `   🏷️  Used in: <${elementTag}>\n`;
                    break;
            }
            
            responseText += '\n';
        });

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };

    } catch (error: any) {
        console.error('Error in queryTailwindClasses:', error);
        return {
            content: [{
                type: 'text',
                text: `Failed to query Tailwind classes: ${error.message}`
            }],
            isError: true
        };
    } finally {
        await session.close();
    }
});

// Start server
async function main() {
    console.log('🔧 Initializing MCP Code Validator...');
    console.log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        NEO4J_URI: process.env.NEO4J_URI,
        NEO4J_USER: process.env.NEO4J_USER
    });
    
    // Test Neo4j connection first
    try {
        const testSession = driver.session();
        await testSession.run('RETURN 1');
        await testSession.close();
        console.log('✅ Neo4j connection verified');
    } catch (error) {
        console.error('❌ Neo4j connection failed:', error);
        process.exit(1);
    }
    
    const transport = new StdioServerTransport();
    
    // Add error handlers for transport
    transport.onclose = () => {
        console.log('📡 Transport connection closed');
        closeDriver();
    };
    
    transport.onerror = (error) => {
        console.error('❌ Transport error:', error);
        closeDriver();
    };
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Gracefully shutting down...');
        await closeDriver();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 SIGTERM received, shutting down...');
        await closeDriver();
        process.exit(0);
    });
    
    process.on('uncaughtException', async (error) => {
        console.error('💥 Uncaught exception:', error);
        await closeDriver();
        process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
        console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
        await closeDriver();
        process.exit(1);
    });

    try {
        console.log('🚀 Starting MCP server...');
        await server.connect(transport);
        console.log('✅ MCP Code Validator server started successfully');
        console.log('📋 Available tools: indexFile, indexFunctions, indexDependencies, validateCode, validateFile, detectHallucinations, validateCodeQuality, suggestImprovements, validateReactHooks, manageContexts, analyzeRelationships, detectJSHallucinations, quickValidateJS, verifyNpmPackages, validateHTML, validateCSS, queryHTMLCSS, validateTailwind, indexHTMLCSS, queryTailwindClasses');
        console.log('🎯 Server ready for connections...');
    } catch (error: any) {
        console.error('❌ Failed to start MCP server:', error);
        console.error('Error details:', {
            message: error?.message || 'Unknown error',
            stack: error?.stack || 'No stack trace',
            name: error?.name || 'Unknown'
        });
        await closeDriver();
        process.exit(1);
    }
}

main();