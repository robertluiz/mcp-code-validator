/**
 * React-specific hallucination detector
 * Validates React patterns, hooks usage, and API calls
 */

import { parseCode } from '../parser';

export interface ReactValidationResult {
    valid: boolean;
    issues: ReactIssue[];
    score: number;
    suggestions: string[];
}

export interface ReactIssue {
    type: 'hook-violation' | 'invalid-api' | 'deprecated' | 'anti-pattern' | 'hallucination';
    severity: 'error' | 'warning' | 'info';
    message: string;
    location?: {
        line: number;
        column: number;
        functionName?: string;
    };
    suggestion?: string;
}

// React hooks that actually exist
const VALID_REACT_HOOKS = new Set([
    'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
    'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect',
    'useDebugValue', 'useId', 'useTransition', 'useDeferredValue',
    'useSyncExternalStore', 'useInsertionEffect'
]);

// Common hallucinated React hooks
const HALLUCINATED_HOOKS = new Set([
    'useAsync', 'usePromise', 'useFetch', 'useApi', 'useData',
    'useRequest', 'useQuery', 'useMutation', 'useStore', 'useObservable',
    'useAutoEffect', 'useAsyncEffect', 'useUpdate', 'useForceUpdate'
]);

// Valid React lifecycle methods for class components
const VALID_LIFECYCLE_METHODS = new Set([
    'constructor', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
    'shouldComponentUpdate', 'render', 'componentDidCatch', 'getDerivedStateFromProps',
    'getSnapshotBeforeUpdate'
]);

// Deprecated React APIs
const DEPRECATED_APIS = new Map([
    ['componentWillMount', 'Use componentDidMount or constructor instead'],
    ['componentWillReceiveProps', 'Use getDerivedStateFromProps or componentDidUpdate instead'],
    ['componentWillUpdate', 'Use componentDidUpdate instead'],
    ['findDOMNode', 'Use ref callbacks instead'],
    ['ReactDOM.render', 'Use ReactDOM.createRoot().render() instead (React 18+)'],
    ['ReactDOM.hydrate', 'Use ReactDOM.hydrateRoot() instead (React 18+)']
]);

export class ReactValidator {
    /**
     * Validate React code for hallucinations and issues
     */
    async validateReactCode(
        code: string,
        options: {
            reactVersion?: string;
            strictMode?: boolean;
            typescript?: boolean;
        } = {}
    ): Promise<ReactValidationResult> {
        const issues: ReactIssue[] = [];
        const suggestions: string[] = [];
        
        // Parse the code
        const parsedCode = parseCode(code, options.typescript ? 'tsx' : 'jsx');
        
        // Validate hooks usage
        this.validateHooks(code, parsedCode, issues, suggestions);
        
        // Validate React API usage
        this.validateReactAPIs(code, parsedCode, issues, suggestions);
        
        // Validate component patterns
        this.validateComponentPatterns(code, parsedCode, issues, suggestions);
        
        // Check for deprecated APIs
        this.checkDeprecatedAPIs(code, issues, suggestions, options.reactVersion);
        
        // Detect hallucinated patterns
        this.detectHallucinatedPatterns(code, parsedCode, issues, suggestions);
        
        // Calculate score
        const score = this.calculateScore(issues);
        
        return {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            score,
            suggestions: [...new Set(suggestions)] // Remove duplicates
        };
    }
    
    /**
     * Validate React hooks usage
     */
    private validateHooks(
        code: string,
        parsedCode: any,
        issues: ReactIssue[],
        suggestions: string[]
    ): void {
        // Find all hook calls
        const hookCalls = this.findHookCalls(code);
        
        for (const hookCall of hookCalls) {
            // Check if hook exists
            if (!VALID_REACT_HOOKS.has(hookCall.name) && !hookCall.name.startsWith('use')) {
                issues.push({
                    type: 'invalid-api',
                    severity: 'error',
                    message: `Invalid hook name: ${hookCall.name}. Hooks must start with 'use'`,
                    location: hookCall.location,
                    suggestion: 'Ensure hook names start with "use" and follow React conventions'
                });
            }
            
            // Check for hallucinated hooks
            if (HALLUCINATED_HOOKS.has(hookCall.name)) {
                issues.push({
                    type: 'hallucination',
                    severity: 'error',
                    message: `Hallucinated hook: ${hookCall.name} does not exist in React`,
                    location: hookCall.location,
                    suggestion: this.suggestAlternativeHook(hookCall.name)
                });
                
                suggestions.push(this.suggestAlternativeHook(hookCall.name));
            }
            
            // Check hook rules violations
            this.validateHookRules(hookCall, code, issues);
        }
        
        // Check for conditional hooks
        this.checkConditionalHooks(code, issues);
        
        // Check for hooks in loops
        this.checkHooksInLoops(code, issues);
    }
    
    /**
     * Find all hook calls in code
     */
    private findHookCalls(code: string): Array<{name: string; location: any}> {
        const hookCalls: Array<{name: string; location: any}> = [];
        const hookPattern = /\b(use[A-Z]\w*)\s*\(/g;
        
        let match;
        while ((match = hookPattern.exec(code)) !== null) {
            const lines = code.substring(0, match.index).split('\n');
            hookCalls.push({
                name: match[1],
                location: {
                    line: lines.length,
                    column: lines[lines.length - 1].length + 1
                }
            });
        }
        
        return hookCalls;
    }
    
    /**
     * Validate hook rules (Rules of Hooks)
     */
    private validateHookRules(
        hookCall: {name: string; location: any},
        code: string,
        issues: ReactIssue[]
    ): void {
        const lines = code.split('\n');
        const hookLine = lines[hookCall.location.line - 1];
        
        // Check if hook is at the top level of a function
        const indentation = hookLine.match(/^\s*/)?.[0].length || 0;
        
        // Simple heuristic: if indentation is too deep, might be conditional
        if (indentation > 8) {
            issues.push({
                type: 'hook-violation',
                severity: 'warning',
                message: `Hook ${hookCall.name} might be called conditionally`,
                location: hookCall.location,
                suggestion: 'Ensure hooks are called at the top level of React functions'
            });
        }
    }
    
    /**
     * Check for conditional hooks
     */
    private checkConditionalHooks(code: string, issues: ReactIssue[]): void {
        // Pattern: if (...) { useHook() }
        const conditionalHookPattern = /if\s*\([^)]+\)\s*{[^}]*\buse[A-Z]\w*\s*\(/g;
        
        let match;
        while ((match = conditionalHookPattern.exec(code)) !== null) {
            const lines = code.substring(0, match.index).split('\n');
            issues.push({
                type: 'hook-violation',
                severity: 'error',
                message: 'Hooks cannot be called conditionally',
                location: {
                    line: lines.length,
                    column: 1
                },
                suggestion: 'Move the hook call outside the conditional block'
            });
        }
        
        // Pattern: condition && useHook()
        const shortCircuitPattern = /\w+\s*&&\s*use[A-Z]\w*\s*\(/g;
        
        while ((match = shortCircuitPattern.exec(code)) !== null) {
            const lines = code.substring(0, match.index).split('\n');
            issues.push({
                type: 'hook-violation',
                severity: 'error',
                message: 'Hooks cannot be called conditionally using &&',
                location: {
                    line: lines.length,
                    column: 1
                },
                suggestion: 'Call the hook unconditionally and handle the condition inside the hook'
            });
        }
    }
    
    /**
     * Check for hooks in loops
     */
    private checkHooksInLoops(code: string, issues: ReactIssue[]): void {
        // Pattern: for/while loops containing hooks
        const loopHookPattern = /(for|while)\s*\([^)]*\)\s*{[^}]*\buse[A-Z]\w*\s*\(/g;
        
        let match;
        while ((match = loopHookPattern.exec(code)) !== null) {
            const lines = code.substring(0, match.index).split('\n');
            issues.push({
                type: 'hook-violation',
                severity: 'error',
                message: 'Hooks cannot be called inside loops',
                location: {
                    line: lines.length,
                    column: 1
                },
                suggestion: 'Move the hook call outside the loop or restructure your component'
            });
        }
        
        // Pattern: array.map with hooks
        const mapHookPattern = /\.\s*map\s*\([^)]*=>[^}]*\buse[A-Z]\w*\s*\(/g;
        
        while ((match = mapHookPattern.exec(code)) !== null) {
            const lines = code.substring(0, match.index).split('\n');
            issues.push({
                type: 'hook-violation',
                severity: 'error',
                message: 'Hooks cannot be called inside map functions',
                location: {
                    line: lines.length,
                    column: 1
                },
                suggestion: 'Extract the mapped element into a separate component'
            });
        }
    }
    
    /**
     * Validate React API usage
     */
    private validateReactAPIs(
        code: string,
        parsedCode: any,
        issues: ReactIssue[],
        suggestions: string[]
    ): void {
        // Check for non-existent React methods
        const reactMethodPattern = /React\.\w+/g;
        const validReactMethods = new Set([
            'createElement', 'cloneElement', 'createContext', 'createRef',
            'forwardRef', 'lazy', 'memo', 'startTransition', 'Fragment',
            'StrictMode', 'Suspense', 'Component', 'PureComponent'
        ]);
        
        let match;
        while ((match = reactMethodPattern.exec(code)) !== null) {
            const method = match[0].split('.')[1];
            if (!validReactMethods.has(method)) {
                const lines = code.substring(0, match.index).split('\n');
                issues.push({
                    type: 'hallucination',
                    severity: 'error',
                    message: `React.${method} does not exist`,
                    location: {
                        line: lines.length,
                        column: lines[lines.length - 1].length + 1
                    },
                    suggestion: `Valid React methods include: ${Array.from(validReactMethods).join(', ')}`
                });
            }
        }
        
        // Check for invalid lifecycle methods
        for (const cls of parsedCode.classes) {
            if (cls.body.includes('extends Component') || cls.body.includes('extends React.Component')) {
                this.validateLifecycleMethods(cls, issues);
            }
        }
    }
    
    /**
     * Validate lifecycle methods in class components
     */
    private validateLifecycleMethods(classNode: any, issues: ReactIssue[]): void {
        const methodPattern = /\b(\w+)\s*\([^)]*\)\s*{/g;
        
        let match;
        while ((match = methodPattern.exec(classNode.body)) !== null) {
            const methodName = match[1];
            
            // Check if it's a lifecycle-looking method that doesn't exist
            if (methodName.startsWith('component') && !VALID_LIFECYCLE_METHODS.has(methodName)) {
                issues.push({
                    type: 'hallucination',
                    severity: 'error',
                    message: `Invalid lifecycle method: ${methodName}`,
                    location: {
                        functionName: classNode.name
                    },
                    suggestion: `Valid lifecycle methods: ${Array.from(VALID_LIFECYCLE_METHODS).join(', ')}`
                });
            }
        }
    }
    
    /**
     * Validate component patterns
     */
    private validateComponentPatterns(
        code: string,
        parsedCode: any,
        issues: ReactIssue[],
        suggestions: string[]
    ): void {
        // Check for invalid JSX
        this.validateJSX(code, issues);
        
        // Check for anti-patterns
        this.checkAntiPatterns(code, parsedCode, issues, suggestions);
    }
    
    /**
     * Validate JSX syntax
     */
    private validateJSX(code: string, issues: ReactIssue[]): void {
        // Check for self-closing void elements with children
        const voidElementsWithChildren = /<(img|br|hr|input|area|base|col|embed|link|meta|param|source|track|wbr)[^>]*>[^<]+<\/\1>/g;
        
        let match;
        while ((match = voidElementsWithChildren.exec(code)) !== null) {
            const lines = code.substring(0, match.index).split('\n');
            issues.push({
                type: 'invalid-api',
                severity: 'error',
                message: `Void element ${match[1]} cannot have children`,
                location: {
                    line: lines.length,
                    column: 1
                },
                suggestion: `Use self-closing tag: <${match[1]} />`
            });
        }
        
        // Check for invalid event handlers
        const eventHandlerPattern = /on[A-Z]\w*\s*=\s*{[^}]+}/g;
        const validEvents = new Set([
            'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
            'onMouseEnter', 'onMouseLeave', 'onKeyDown', 'onKeyUp'
        ]);
        
        while ((match = eventHandlerPattern.exec(code)) !== null) {
            const eventName = match[0].split('=')[0].trim();
            if (!eventName.startsWith('on') || eventName.length < 4) {
                const lines = code.substring(0, match.index).split('\n');
                issues.push({
                    type: 'invalid-api',
                    severity: 'warning',
                    message: `Suspicious event handler: ${eventName}`,
                    location: {
                        line: lines.length,
                        column: 1
                    },
                    suggestion: 'Event handlers should start with "on" followed by the event name'
                });
            }
        }
    }
    
    /**
     * Check for React anti-patterns
     */
    private checkAntiPatterns(
        code: string,
        parsedCode: any,
        issues: ReactIssue[],
        suggestions: string[]
    ): void {
        // Direct state mutation
        if (code.includes('this.state.') && code.includes('=') && !code.includes('this.state =')) {
            issues.push({
                type: 'anti-pattern',
                severity: 'error',
                message: 'Direct state mutation detected',
                suggestion: 'Use setState() to update state'
            });
        }
        
        // Array index as key
        const arrayIndexKeyPattern = /key\s*=\s*{\s*index\s*}/g;
        if (arrayIndexKeyPattern.test(code)) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'Using array index as key in list rendering',
                suggestion: 'Use a stable, unique identifier as key'
            });
        }
        
        // Missing key prop in lists
        const mapWithoutKey = /\.map\s*\([^)]+\)\s*=>\s*[^}]+<[^>]+>/g;
        if (mapWithoutKey.test(code) && !code.includes('key=')) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'Missing key prop in list rendering',
                suggestion: 'Add a unique key prop to list items'
            });
        }
    }
    
    /**
     * Check for deprecated APIs
     */
    private checkDeprecatedAPIs(
        code: string,
        issues: ReactIssue[],
        suggestions: string[],
        reactVersion?: string
    ): void {
        for (const [api, suggestion] of DEPRECATED_APIS.entries()) {
            if (code.includes(api)) {
                issues.push({
                    type: 'deprecated',
                    severity: 'warning',
                    message: `Deprecated API: ${api}`,
                    suggestion
                });
                
                suggestions.push(suggestion);
            }
        }
    }
    
    /**
     * Detect hallucinated React patterns
     */
    private detectHallucinatedPatterns(
        code: string,
        parsedCode: any,
        issues: ReactIssue[],
        suggestions: string[]
    ): void {
        // Common hallucinated patterns
        const hallucinatedPatterns = [
            {
                pattern: /useAsyncEffect/g,
                message: 'useAsyncEffect does not exist. Use useEffect with async function inside',
                suggestion: 'useEffect(() => { const fetchData = async () => { ... }; fetchData(); }, [])'
            },
            {
                pattern: /React\.fetch/g,
                message: 'React.fetch does not exist. Use native fetch or a library like axios',
                suggestion: 'Use fetch() or import a HTTP library'
            },
            {
                pattern: /useState\.set/g,
                message: 'useState does not have a .set method',
                suggestion: 'Use the setter function returned by useState: const [state, setState] = useState()'
            },
            {
                pattern: /useStore/g,
                message: 'useStore is not a built-in React hook',
                suggestion: 'Use useContext with a store provider or a state management library'
            }
        ];
        
        for (const { pattern, message, suggestion } of hallucinatedPatterns) {
            if (pattern.test(code)) {
                issues.push({
                    type: 'hallucination',
                    severity: 'error',
                    message,
                    suggestion
                });
                
                suggestions.push(suggestion);
            }
        }
    }
    
    /**
     * Suggest alternative for hallucinated hooks
     */
    private suggestAlternativeHook(hookName: string): string {
        const alternatives: Record<string, string> = {
            'useAsync': 'Use useEffect with async function: useEffect(() => { async function fetchData() {...} fetchData(); }, [])',
            'useFetch': 'Use useEffect with fetch: useEffect(() => { fetch(url).then(...) }, [])',
            'useApi': 'Create custom hook using useEffect and useState',
            'usePromise': 'Use useEffect to handle promises',
            'useForceUpdate': 'Use useState: const [, forceUpdate] = useReducer(x => x + 1, 0)',
            'useUpdate': 'Use useEffect with dependencies',
            'useObservable': 'Use useEffect with subscription pattern'
        };
        
        return alternatives[hookName] || 'Use built-in React hooks or create a custom hook';
    }
    
    /**
     * Calculate validation score
     */
    private calculateScore(issues: ReactIssue[]): number {
        let score = 100;
        
        for (const issue of issues) {
            switch (issue.severity) {
                case 'error':
                    score -= 20;
                    break;
                case 'warning':
                    score -= 10;
                    break;
                case 'info':
                    score -= 5;
                    break;
            }
        }
        
        return Math.max(0, score);
    }
}

// Export singleton instance
export const reactValidator = new ReactValidator();