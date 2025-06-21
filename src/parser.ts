import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import JavaScript from 'tree-sitter-javascript';

const { typescript, tsx } = TypeScript;
const javascript = JavaScript;

export interface ReactComponent {
    name: string;
    type: 'functional' | 'class';
    props: string[];
    hooks: string[];
    body: string;
    isDefaultExport: boolean;
}

export interface ReactHook {
    name: string;
    type: string; // useState, useEffect, custom, etc.
    dependencies?: string[];
    body: string;
}

export interface NextJsPattern {
    type: 'page' | 'api' | 'middleware' | 'layout' | 'app-router';
    name: string;
    exports: string[];
    body: string;
}

export interface FrontendElement {
    type: 'styled-component' | 'css-module' | 'tailwind-class' | 'emotion' | 'chakra-ui';
    name: string;
    styles: string;
    body: string;
}

export interface ParsedCode {
    functions: { name: string; body: string }[];
    classes: { name: string; body: string }[];
    reactComponents: ReactComponent[];
    reactHooks: ReactHook[];
    nextjsPatterns: NextJsPattern[];
    frontendElements: FrontendElement[];
    imports: { source: string; imports: string[] }[];
    exports: { name: string; type: 'default' | 'named' }[];
}

const typescriptParser = new Parser();
const jsxParser = new Parser();

typescriptParser.setLanguage(typescript);
jsxParser.setLanguage(tsx);

/**
 * Parses source code using tree-sitter to extract structured information including React/Next.js patterns.
 * @param code The source code string.
 * @param fileExtension The file extension (ts, tsx, js, jsx) to determine parser.
 * @returns A ParsedCode object containing all parsed elements.
 */
export function parseCode(code: string, fileExtension: string = 'ts'): ParsedCode {
    const isJsx = fileExtension === 'tsx' || fileExtension === 'jsx';
    const parser = isJsx ? jsxParser : typescriptParser;
    
    const tree = parser.parse(code);
    const functions: { name: string; body: string }[] = [];
    const classes: { name: string; body: string }[] = [];
    const reactComponents: ReactComponent[] = [];
    const reactHooks: ReactHook[] = [];
    const nextjsPatterns: NextJsPattern[] = [];
    const frontendElements: FrontendElement[] = [];
    const imports: { source: string; imports: string[] }[] = [];
    const exports: { name: string; type: 'default' | 'named' }[] = [];

    function traverse(node: Parser.SyntaxNode) {
        // Safety check
        if (!node || !node.type) {
            return;
        }
        
        // Parse imports
        if (node.type === 'import_statement') {
            parseImportStatement(node, imports);
        }
        
        // Parse exports
        if (node.type === 'export_statement' || node.type === 'export_default_declaration') {
            parseExportStatement(node, exports);
        }

        // Parse functions (including React components)
        if (node.type === 'function_declaration' || node.type === 'method_definition' || 
            (node.type === 'lexical_declaration' && node.text.includes('=>'))) {
            const nameNode = node.childForFieldName('name');
            const name = nameNode?.text || (node.firstNamedChild?.type === 'variable_declarator' ? 
                node.firstNamedChild.firstNamedChild?.text : 'anonymous');
            const bodyNode = node.childForFieldName('body');
            
            if (name && bodyNode) {
                functions.push({ name, body: bodyNode.text });
                
                // Check if it's a React component
                if (isReactComponent(node, name)) {
                    const component = parseReactComponent(node, name);
                    reactComponents.push(component);
                }
                
                // Check for Next.js patterns
                const nextPattern = parseNextJsPattern(node, name);
                if (nextPattern) {
                    nextjsPatterns.push(nextPattern);
                }
            }
        } 
        // Parse classes (including React class components)
        else if (node.type === 'class_declaration') {
            const nameNode = node.childForFieldName('name');
            const bodyNode = node.childForFieldName('body');
            if (nameNode && bodyNode) {
                classes.push({ name: nameNode.text, body: bodyNode.text });
                
                // Check if it's a React class component
                if (isReactClassComponent(node)) {
                    const component = parseReactClassComponent(node, nameNode.text);
                    reactComponents.push(component);
                }
            }
        }
        // Parse React hooks usage
        else if (node.type === 'call_expression') {
            const hook = parseReactHook(node);
            if (hook) {
                reactHooks.push(hook);
            }
        }
        // Parse styled components and CSS-in-JS
        else if (node.type === 'template_string' || node.type === 'tagged_template_expression') {
            const styledElement = parseStyledComponent(node);
            if (styledElement) {
                frontendElements.push(styledElement);
            }
        }

        if (node.children) {
            for (const child of node.children) {
                if (child) {
                    traverse(child);
                }
            }
        }
    }

    if (tree && tree.rootNode) {
        traverse(tree.rootNode);
    }
    return { 
        functions, 
        classes, 
        reactComponents, 
        reactHooks, 
        nextjsPatterns, 
        frontendElements, 
        imports, 
        exports 
    };
}

function parseImportStatement(node: Parser.SyntaxNode, imports: { source: string; imports: string[] }[]): void {
    const sourceNode = node.children.find(child => child.type === 'string');
    if (sourceNode) {
        const source = sourceNode.text.replace(/['"]/g, '');
        const importClause = node.children.find(child => child.type === 'import_clause');
        const importNames: string[] = [];
        
        if (importClause) {
            // Extract import names (simplified)
            const namedImports = importClause.children.find(child => child.type === 'named_imports');
            if (namedImports) {
                namedImports.children.forEach(child => {
                    if (child.type === 'import_specifier') {
                        const name = child.children.find(c => c.type === 'identifier');
                        if (name) importNames.push(name.text);
                    }
                });
            }
            
            // Check for default import
            const defaultImport = importClause.children.find(child => child.type === 'identifier');
            if (defaultImport) {
                importNames.push(defaultImport.text);
            }
        }
        
        imports.push({ source, imports: importNames });
    }
}

function parseExportStatement(node: Parser.SyntaxNode, exports: { name: string; type: 'default' | 'named' }[]): void {
    if (node.type === 'export_default_declaration') {
        const declaration = node.children.find(child => 
            child.type === 'function_declaration' || 
            child.type === 'class_declaration' || 
            child.type === 'identifier'
        );
        if (declaration) {
            const nameNode = declaration.type === 'identifier' ? declaration : declaration.childForFieldName('name');
            if (nameNode) {
                exports.push({ name: nameNode.text, type: 'default' });
            }
        }
    } else if (node.type === 'export_statement') {
        // Handle named exports
        const exportClause = node.children.find(child => child.type === 'export_clause');
        if (exportClause) {
            exportClause.children.forEach(child => {
                if (child.type === 'export_specifier') {
                    const name = child.children.find(c => c.type === 'identifier');
                    if (name) exports.push({ name: name.text, type: 'named' });
                }
            });
        }
    }
}

function isReactComponent(node: Parser.SyntaxNode, name: string): boolean {
    // React components typically start with uppercase
    const startsWithUppercase = /^[A-Z]/.test(name);
    const hasJSXReturn = node.text.includes('return') && 
                       (node.text.includes('<') || node.text.includes('jsx') || node.text.includes('createElement'));
    
    return startsWithUppercase && hasJSXReturn;
}

function isReactClassComponent(node: Parser.SyntaxNode): boolean {
    // Check if class extends React.Component or Component
    const heritageClause = node.children.find(child => child.type === 'class_heritage');
    if (heritageClause) {
        return heritageClause.text.includes('Component') || heritageClause.text.includes('React.Component');
    }
    return false;
}

function parseReactComponent(node: Parser.SyntaxNode, name: string): ReactComponent {
    const props = extractProps(node);
    const hooks = extractHooks(node);
    const isDefaultExport = checkIfDefaultExport(node, name);
    
    return {
        name,
        type: 'functional',
        props,
        hooks,
        body: node.text,
        isDefaultExport
    };
}

function parseReactClassComponent(node: Parser.SyntaxNode, name: string): ReactComponent {
    const props = extractClassProps(node);
    const hooks: string[] = []; // Class components don't use hooks
    const isDefaultExport = checkIfDefaultExport(node, name);
    
    return {
        name,
        type: 'class',
        props,
        hooks,
        body: node.text,
        isDefaultExport
    };
}

function parseReactHook(node: Parser.SyntaxNode): ReactHook | null {
    const member = node.children.find(child => child.type === 'member_expression');
    const identifier = node.children.find(child => child.type === 'identifier');
    
    let hookName = '';
    if (member) {
        hookName = member.text;
    } else if (identifier) {
        hookName = identifier.text;
    }
    
    // Check if it's a hook (starts with 'use')
    if (hookName.startsWith('use')) {
        const hookType = determineHookType(hookName);
        const dependencies = extractHookDependencies(node);
        
        return {
            name: hookName,
            type: hookType,
            dependencies,
            body: node.text
        };
    }
    
    return null;
}

function parseNextJsPattern(node: Parser.SyntaxNode, name: string): NextJsPattern | null {
    // Check for Next.js specific patterns
    const text = node.text;
    
    // API routes
    if (name === 'handler' || text.includes('NextApiRequest') || text.includes('NextApiResponse')) {
        return {
            type: 'api',
            name,
            exports: ['default'],
            body: text
        };
    }
    
    // Page components
    if (name === 'getServerSideProps' || name === 'getStaticProps' || name === 'getStaticPaths') {
        return {
            type: 'page',
            name,
            exports: [name],
            body: text
        };
    }
    
    // App router patterns
    if (name === 'generateMetadata' || name === 'generateViewport') {
        return {
            type: 'app-router',
            name,
            exports: [name],
            body: text
        };
    }
    
    return null;
}

function parseStyledComponent(node: Parser.SyntaxNode): FrontendElement | null {
    const text = node.text;
    
    // Styled components
    if (text.includes('styled.') || text.includes('styled(')) {
        return {
            type: 'styled-component',
            name: 'StyledComponent',
            styles: text,
            body: node.text
        };
    }
    
    // Emotion
    if (text.includes('css`') || text.includes('emotion')) {
        return {
            type: 'emotion',
            name: 'EmotionStyle',
            styles: text,
            body: node.text
        };
    }
    
    return null;
}

// Helper functions
function extractProps(node: Parser.SyntaxNode): string[] {
    const props: string[] = [];
    const parameters = node.children.find(child => child.type === 'formal_parameters');
    if (parameters) {
        // Simplified prop extraction
        const propsParam = parameters.children.find(child => child.type === 'identifier' || child.type === 'object_pattern');
        if (propsParam && propsParam.type === 'object_pattern') {
            propsParam.children.forEach(child => {
                if (child.type === 'shorthand_property_identifier_pattern') {
                    props.push(child.text);
                }
            });
        }
    }
    return props;
}

function extractClassProps(node: Parser.SyntaxNode): string[] {
    // Extract props from class component (simplified)
    const props: string[] = [];
    if (node.text.includes('this.props.')) {
        const matches = node.text.match(/this\.props\.(\w+)/g);
        if (matches) {
            matches.forEach(match => {
                const prop = match.replace('this.props.', '');
                if (!props.includes(prop)) {
                    props.push(prop);
                }
            });
        }
    }
    return props;
}

function extractHooks(node: Parser.SyntaxNode): string[] {
    const hooks: string[] = [];
    const hookPattern = /use[A-Z]\w*/g;
    const matches = node.text.match(hookPattern);
    if (matches) {
        matches.forEach(hook => {
            if (!hooks.includes(hook)) {
                hooks.push(hook);
            }
        });
    }
    return hooks;
}

function checkIfDefaultExport(node: Parser.SyntaxNode, name: string): boolean {
    // Check if this component is exported as default (simplified)
    let parent = node.parent;
    while (parent) {
        if (parent.type === 'export_default_declaration') {
            return true;
        }
        parent = parent.parent;
    }
    return false;
}

function determineHookType(hookName: string): string {
    if (hookName === 'useState') return 'state';
    if (hookName === 'useEffect') return 'effect';
    if (hookName === 'useCallback') return 'callback';
    if (hookName === 'useMemo') return 'memo';
    if (hookName === 'useRef') return 'ref';
    if (hookName === 'useContext') return 'context';
    if (hookName === 'useReducer') return 'reducer';
    if (hookName.startsWith('use') && hookName !== 'use') return 'custom';
    return 'unknown';
}

function extractHookDependencies(node: Parser.SyntaxNode): string[] {
    // Extract dependency array from useEffect, useCallback, useMemo
    const deps: string[] = [];
    const arrayPattern = /\[(.*?)\]/s;
    const match = node.text.match(arrayPattern);
    if (match && match[1]) {
        const depsText = match[1].trim();
        if (depsText) {
            deps.push(...depsText.split(',').map(dep => dep.trim()));
        }
    }
    return deps;
}
