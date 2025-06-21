/**
 * Detector de alucinações específico para React
 * Foca em hooks, APIs e padrões comumente alucinados
 */

export interface ReactHallucinationResult {
    valid: boolean;
    issues: ReactHallucinationIssue[];
    score: number;
    suggestions: string[];
}

export interface ReactHallucinationIssue {
    type: 'hallucinated-hook' | 'invalid-react-api' | 'hook-rule-violation' | 'deprecated-api' | 'anti-pattern';
    severity: 'error' | 'warning' | 'info';
    message: string;
    location: {
        line?: number;
        hook?: string;
        api?: string;
        context?: string;
    };
    suggestion: string;
}

// Hooks válidos do React
const VALID_REACT_HOOKS = new Set([
    'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
    'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect',
    'useDebugValue', 'useId', 'useTransition', 'useDeferredValue',
    'useSyncExternalStore', 'useInsertionEffect'
]);

// Hooks comumente alucinados
const HALLUCINATED_HOOKS = {
    // Async/Promise hooks (não existem)
    'useAsync': {
        message: 'useAsync não é um hook nativo do React',
        suggestion: 'Use useEffect com async function: useEffect(() => { async function fetchData() {...} fetchData(); }, [])'
    },
    'usePromise': {
        message: 'usePromise não é um hook nativo do React',
        suggestion: 'Use useEffect com Promise: useEffect(() => { promise.then(setData) }, [])'
    },
    'useFetch': {
        message: 'useFetch não é um hook nativo do React',
        suggestion: 'Use useEffect com fetch: useEffect(() => { fetch(url).then(res => res.json()).then(setData) }, [])'
    },
    'useApi': {
        message: 'useApi não é um hook nativo do React',
        suggestion: 'Crie um custom hook usando useEffect e useState'
    },
    'useRequest': {
        message: 'useRequest não é um hook nativo do React',
        suggestion: 'Use bibliotecas como SWR, React Query ou crie custom hook'
    },
    
    // State management hooks (não existem)
    'useStore': {
        message: 'useStore não é um hook nativo do React',
        suggestion: 'Use useContext com Provider ou bibliotecas como Zustand, Redux Toolkit'
    },
    'useGlobalState': {
        message: 'useGlobalState não é um hook nativo do React',
        suggestion: 'Use useContext ou bibliotecas de estado global'
    },
    'useObservable': {
        message: 'useObservable não é um hook nativo do React',
        suggestion: 'Use useEffect com subscription pattern'
    },
    
    // Effect hooks (não existem)
    'useAsyncEffect': {
        message: 'useAsyncEffect não é um hook nativo do React',
        suggestion: 'Use useEffect com async function inside: useEffect(() => { async function run() {...} run(); }, [])'
    },
    'useMount': {
        message: 'useMount não é um hook nativo do React',
        suggestion: 'Use useEffect(() => { ... }, [])'
    },
    'useUnmount': {
        message: 'useUnmount não é um hook nativo do React',
        suggestion: 'Use useEffect(() => { return () => { ... } }, [])'
    },
    'useUpdate': {
        message: 'useUpdate não é um hook nativo do React',
        suggestion: 'Use useEffect com dependencies'
    },
    'useForceUpdate': {
        message: 'useForceUpdate não é um hook nativo do React',
        suggestion: 'Use const [, forceUpdate] = useReducer(x => x + 1, 0)'
    },
    
    // Timer hooks (não existem)
    'useInterval': {
        message: 'useInterval não é um hook nativo do React',
        suggestion: 'Use useEffect com setInterval: useEffect(() => { const id = setInterval(fn, delay); return () => clearInterval(id); }, [])'
    },
    'useTimeout': {
        message: 'useTimeout não é um hook nativo do React',
        suggestion: 'Use useEffect com setTimeout: useEffect(() => { const id = setTimeout(fn, delay); return () => clearTimeout(id); }, [])'
    },
    'useDebounce': {
        message: 'useDebounce não é um hook nativo do React',
        suggestion: 'Crie custom hook usando useEffect e setTimeout'
    },
    'useThrottle': {
        message: 'useThrottle não é um hook nativo do React',
        suggestion: 'Crie custom hook com throttling logic'
    }
};

// APIs React comumente alucinadas
const HALLUCINATED_REACT_APIS = {
    // HTTP/Fetch APIs (não existem no React)
    'React.fetch': {
        message: 'React.fetch não existe',
        suggestion: 'Use fetch() nativo ou bibliotecas como axios'
    },
    'React.ajax': {
        message: 'React.ajax não existe',
        suggestion: 'Use fetch() ou bibliotecas HTTP'
    },
    'React.http': {
        message: 'React.http não existe',
        suggestion: 'Use fetch() ou bibliotecas HTTP'
    },
    'React.request': {
        message: 'React.request não existe',
        suggestion: 'Use fetch() ou bibliotecas HTTP'
    },
    
    // State management APIs (não existem)
    'React.store': {
        message: 'React.store não existe',
        suggestion: 'Use Context API ou bibliotecas como Redux'
    },
    'React.state': {
        message: 'React.state não existe',
        suggestion: 'Use useState hook ou class component state'
    },
    'React.globalState': {
        message: 'React.globalState não existe',
        suggestion: 'Use Context API ou state management libraries'
    },
    
    // Utility APIs (não existem)
    'React.utils': {
        message: 'React.utils não existe',
        suggestion: 'Use utilities específicas ou bibliotecas separadas'
    },
    'React.helpers': {
        message: 'React.helpers não existe',
        suggestion: 'Use funções utility específicas'
    },
    'React.validator': {
        message: 'React.validator não existe',
        suggestion: 'Use bibliotecas de validação como Joi, Yup, Zod'
    }
};

// APIs depreciadas do React
const DEPRECATED_REACT_APIS = {
    'componentWillMount': 'Use componentDidMount ou constructor',
    'componentWillReceiveProps': 'Use getDerivedStateFromProps ou componentDidUpdate',
    'componentWillUpdate': 'Use componentDidUpdate',
    'UNSAFE_componentWillMount': 'Use componentDidMount ou constructor',
    'UNSAFE_componentWillReceiveProps': 'Use getDerivedStateFromProps',
    'UNSAFE_componentWillUpdate': 'Use componentDidUpdate',
    'findDOMNode': 'Use ref callbacks',
    'ReactDOM.render': 'Use ReactDOM.createRoot().render() (React 18+)',
    'ReactDOM.hydrate': 'Use ReactDOM.hydrateRoot() (React 18+)',
    'React.createFactory': 'Use React.createElement ou JSX'
};

export class ReactHallucinationDetector {
    /**
     * Detectar alucinações em código React
     */
    async detectReactHallucinations(
        code: string,
        options: {
            reactVersion?: string;
            typescript?: boolean;
            strictMode?: boolean;
        } = {}
    ): Promise<ReactHallucinationResult> {
        const issues: ReactHallucinationIssue[] = [];
        const suggestions: string[] = [];
        
        // Detectar hooks alucinados
        this.detectHallucinatedHooks(code, issues, suggestions);
        
        // Detectar APIs React alucinadas
        this.detectHallucinatedReactAPIs(code, issues, suggestions);
        
        // Detectar violações das regras dos hooks
        this.detectHookRuleViolations(code, issues, suggestions);
        
        // Detectar APIs depreciadas
        this.detectDeprecatedAPIs(code, issues, suggestions);
        
        // Detectar anti-patterns
        this.detectAntiPatterns(code, issues, suggestions);
        
        // Calcular pontuação
        const score = this.calculateScore(issues);
        
        return {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            score,
            suggestions: [...new Set(suggestions)]
        };
    }
    
    /**
     * Detectar hooks alucinados
     */
    private detectHallucinatedHooks(
        code: string,
        issues: ReactHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Padrão para encontrar chamadas de hook
        const hookPattern = /\b(use[A-Z]\w*)\s*\(/g;
        
        let match;
        while ((match = hookPattern.exec(code)) !== null) {
            const hookName = match[1];
            
            // Verificar se é um hook alucinado conhecido
            if (HALLUCINATED_HOOKS[hookName as keyof typeof HALLUCINATED_HOOKS]) {
                const hookInfo = HALLUCINATED_HOOKS[hookName as keyof typeof HALLUCINATED_HOOKS];
                
                issues.push({
                    type: 'hallucinated-hook',
                    severity: 'error',
                    message: hookInfo.message,
                    location: {
                        hook: hookName,
                        context: this.extractContext(code, match.index)
                    },
                    suggestion: hookInfo.suggestion
                });
                
                suggestions.push(hookInfo.suggestion);
            }
            // Verificar se segue convenções de hook mas não é válido
            else if (!VALID_REACT_HOOKS.has(hookName) && !hookName.startsWith('use')) {
                issues.push({
                    type: 'hallucinated-hook',
                    severity: 'warning',
                    message: `${hookName} parece ser um hook mas não segue a convenção (deve começar com 'use')`,
                    location: {
                        hook: hookName
                    },
                    suggestion: 'Hooks devem começar com "use" seguido de letra maiúscula'
                });
            }
            // Hook personalizado suspeito
            else if (!VALID_REACT_HOOKS.has(hookName) && hookName.startsWith('use')) {
                // Verificar se parece com hook alucinado comum
                const suspiciousPatterns = [
                    /use.*Api$/i, /use.*Fetch$/i, /use.*Request$/i, /use.*Async$/i,
                    /use.*Promise$/i, /use.*Store$/i, /use.*Global$/i
                ];
                
                const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(hookName));
                
                if (isSuspicious) {
                    issues.push({
                        type: 'hallucinated-hook',
                        severity: 'warning',
                        message: `${hookName} parece ser um hook personalizado com padrão suspeito`,
                        location: {
                            hook: hookName
                        },
                        suggestion: 'Verifique se este hook existe ou implemente-o como custom hook'
                    });
                }
            }
        }
    }
    
    /**
     * Detectar APIs React alucinadas
     */
    private detectHallucinatedReactAPIs(
        code: string,
        issues: ReactHallucinationIssue[],
        suggestions: string[]
    ): void {
        for (const [api, info] of Object.entries(HALLUCINATED_REACT_APIS)) {
            if (code.includes(api)) {
                issues.push({
                    type: 'invalid-react-api',
                    severity: 'error',
                    message: info.message,
                    location: {
                        api
                    },
                    suggestion: info.suggestion
                });
                
                suggestions.push(info.suggestion);
            }
        }
        
        // Detectar padrões gerais de APIs alucinadas
        const reactApiPattern = /React\.(\w+)/g;
        const validReactAPIs = new Set([
            'createElement', 'cloneElement', 'createContext', 'createRef',
            'forwardRef', 'lazy', 'memo', 'startTransition', 'Fragment',
            'StrictMode', 'Suspense', 'Component', 'PureComponent',
            'useState', 'useEffect', 'useContext', 'useReducer',
            'useCallback', 'useMemo', 'useRef', 'useImperativeHandle',
            'useLayoutEffect', 'useDebugValue'
        ]);
        
        let match;
        while ((match = reactApiPattern.exec(code)) !== null) {
            const apiName = match[1];
            
            if (!validReactAPIs.has(apiName)) {
                issues.push({
                    type: 'invalid-react-api',
                    severity: 'error',
                    message: `React.${apiName} não é uma API válida do React`,
                    location: {
                        api: `React.${apiName}`
                    },
                    suggestion: `APIs válidas do React: ${Array.from(validReactAPIs).join(', ')}`
                });
            }
        }
    }
    
    /**
     * Detectar violações das regras dos hooks
     */
    private detectHookRuleViolations(
        code: string,
        issues: ReactHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Regra 1: Hooks não podem ser chamados condicionalmente
        this.detectConditionalHooks(code, issues, suggestions);
        
        // Regra 2: Hooks não podem ser chamados em loops
        this.detectHooksInLoops(code, issues, suggestions);
        
        // Regra 3: Hooks só podem ser chamados em componentes React ou custom hooks
        this.detectHooksOutsideComponents(code, issues, suggestions);
    }
    
    /**
     * Detectar hooks condicionais
     */
    private detectConditionalHooks(
        code: string,
        issues: ReactHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Padrão: if (...) { useHook() }
        const conditionalHookPattern = /if\s*\([^)]+\)\s*{[^}]*\buse[A-Z]\w*\s*\(/g;
        
        if (conditionalHookPattern.test(code)) {
            issues.push({
                type: 'hook-rule-violation',
                severity: 'error',
                message: 'Hooks não podem ser chamados condicionalmente',
                location: {
                    context: 'Conditional hook call'
                },
                suggestion: 'Mova a chamada do hook para fora do bloco condicional e gerencie a condição dentro do hook'
            });
            
            suggestions.push('Hooks devem ser chamados na mesma ordem a cada renderização');
        }
        
        // Padrão: condition && useHook()
        const shortCircuitPattern = /\w+\s*&&\s*use[A-Z]\w*\s*\(/g;
        
        if (shortCircuitPattern.test(code)) {
            issues.push({
                type: 'hook-rule-violation',
                severity: 'error',
                message: 'Hooks não podem ser chamados condicionalmente usando &&',
                location: {
                    context: 'Short-circuit hook call'
                },
                suggestion: 'Chame o hook incondicionalmente e gerencie a condição dentro dele'
            });
        }
        
        // Padrão: ternário com hook
        const ternaryHookPattern = /\?\s*use[A-Z]\w*\s*\(|\:\s*use[A-Z]\w*\s*\(/g;
        
        if (ternaryHookPattern.test(code)) {
            issues.push({
                type: 'hook-rule-violation',
                severity: 'error',
                message: 'Hooks não podem ser chamados em operadores ternários',
                location: {
                    context: 'Ternary hook call'
                },
                suggestion: 'Chame o hook incondicionalmente'
            });
        }
    }
    
    /**
     * Detectar hooks em loops
     */
    private detectHooksInLoops(
        code: string,
        issues: ReactHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Padrão: for/while loops com hooks
        const loopHookPattern = /(for|while)\s*\([^)]*\)\s*{[^}]*\buse[A-Z]\w*\s*\(/g;
        
        if (loopHookPattern.test(code)) {
            issues.push({
                type: 'hook-rule-violation',
                severity: 'error',
                message: 'Hooks não podem ser chamados dentro de loops',
                location: {
                    context: 'Hook inside loop'
                },
                suggestion: 'Mova o hook para fora do loop ou reestruture o componente'
            });
        }
        
        // Padrão: array.map com hooks
        const mapHookPattern = /\.\s*map\s*\([^)]*=>[^}]*\buse[A-Z]\w*\s*\(/g;
        
        if (mapHookPattern.test(code)) {
            issues.push({
                type: 'hook-rule-violation',
                severity: 'error',
                message: 'Hooks não podem ser chamados dentro de funções map',
                location: {
                    context: 'Hook inside map function'
                },
                suggestion: 'Extraia o elemento mapeado para um componente separado'
            });
        }
    }
    
    /**
     * Detectar hooks fora de componentes
     */
    private detectHooksOutsideComponents(
        code: string,
        issues: ReactHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Esta é uma verificação simplificada
        // Em uma implementação completa, seria necessário fazer parsing mais sofisticado
        
        // Verificar se há hooks em funções que não parecem ser componentes ou hooks
        const functionPattern = /function\s+(\w+)[^{]*{([^}]*)}/g;
        
        let match;
        while ((match = functionPattern.exec(code)) !== null) {
            const functionName = match[1];
            const functionBody = match[2];
            
            // Se a função contém hooks mas não parece ser um componente ou hook
            if (functionBody.includes('use') && 
                !functionName.startsWith('use') && 
                !functionName[0].match(/[A-Z]/)) {
                
                const hasHooks = /\buse[A-Z]\w*\s*\(/.test(functionBody);
                
                if (hasHooks) {
                    issues.push({
                        type: 'hook-rule-violation',
                        severity: 'error',
                        message: `Hooks só podem ser chamados em componentes React ou custom hooks. Função '${functionName}' não parece ser nem um nem outro`,
                        location: {
                            context: `Function ${functionName}`
                        },
                        suggestion: 'Renomeie a função para começar com "use" (custom hook) ou letra maiúscula (componente)'
                    });
                }
            }
        }
    }
    
    /**
     * Detectar APIs depreciadas
     */
    private detectDeprecatedAPIs(
        code: string,
        issues: ReactHallucinationIssue[],
        suggestions: string[]
    ): void {
        for (const [api, suggestion] of Object.entries(DEPRECATED_REACT_APIS)) {
            if (code.includes(api)) {
                issues.push({
                    type: 'deprecated-api',
                    severity: 'warning',
                    message: `${api} está depreciado no React`,
                    location: {
                        api
                    },
                    suggestion
                });
                
                suggestions.push(suggestion);
            }
        }
    }
    
    /**
     * Detectar anti-patterns
     */
    private detectAntiPatterns(
        code: string,
        issues: ReactHallucinationIssue[],
        suggestions: string[]
    ): void {
        // useState com objeto mutável
        if (code.includes('useState') && code.includes('.push(') || code.includes('.pop(')) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'Possível mutação direta de estado useState',
                location: {
                    context: 'State mutation'
                },
                suggestion: 'Use spread operator ou bibliotecas imutáveis para atualizar arrays no estado'
            });
        }
        
        // useEffect sem dependencies
        const useEffectPattern = /useEffect\s*\(\s*[^,)]+\s*\)/g;
        
        if (useEffectPattern.test(code)) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'useEffect sem array de dependências pode causar loops infinitos',
                location: {
                    context: 'useEffect without dependencies'
                },
                suggestion: 'Adicione array de dependências como segundo parâmetro'
            });
        }
        
        // Inline function em props
        const inlineFunctionPattern = /\w+\s*=\s*{\s*\([^)]*\)\s*=>/g;
        
        if (inlineFunctionPattern.test(code)) {
            issues.push({
                type: 'anti-pattern',
                severity: 'info',
                message: 'Funções inline em props podem causar renderizações desnecessárias',
                location: {
                    context: 'Inline function prop'
                },
                suggestion: 'Use useCallback para otimizar funções que são passadas como props'
            });
        }
    }
    
    /**
     * Extrair contexto ao redor de uma posição
     */
    private extractContext(code: string, position: number): string {
        const lines = code.split('\n');
        let currentPos = 0;
        
        for (let i = 0; i < lines.length; i++) {
            if (currentPos + lines[i].length >= position) {
                return lines[i].trim();
            }
            currentPos += lines[i].length + 1;
        }
        
        return '';
    }
    
    /**
     * Calcular pontuação
     */
    private calculateScore(issues: ReactHallucinationIssue[]): number {
        let score = 100;
        
        for (const issue of issues) {
            switch (issue.severity) {
                case 'error':
                    score -= 25;
                    break;
                case 'warning':
                    score -= 15;
                    break;
                case 'info':
                    score -= 5;
                    break;
            }
        }
        
        return Math.max(0, score);
    }
}

// Export singleton
export const reactHallucinationDetector = new ReactHallucinationDetector();