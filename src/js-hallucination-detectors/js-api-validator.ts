/**
 * Validador de APIs JavaScript/TypeScript
 * Detecta métodos e propriedades que não existem
 */

export interface JSAPIValidationResult {
    valid: boolean;
    issues: JSAPIIssue[];
    score: number;
    suggestions: string[];
}

export interface JSAPIIssue {
    type: 'invalid-method' | 'invalid-property' | 'deprecated' | 'wrong-environment' | 'hallucination';
    severity: 'error' | 'warning' | 'info';
    message: string;
    location: {
        line?: number;
        api: string;
        context?: string;
    };
    suggestion?: string;
}

// APIs válidas do JavaScript nativo
const NATIVE_JS_APIS = {
    Array: {
        static: ['from', 'isArray', 'of'],
        prototype: [
            'concat', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex',
            'flat', 'flatMap', 'forEach', 'includes', 'indexOf', 'join', 'keys',
            'lastIndexOf', 'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse',
            'shift', 'slice', 'some', 'sort', 'splice', 'toString', 'unshift', 'values'
        ]
    },
    Object: {
        static: [
            'assign', 'create', 'defineProperty', 'defineProperties', 'entries',
            'freeze', 'fromEntries', 'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors',
            'getOwnPropertyNames', 'getOwnPropertySymbols', 'getPrototypeOf', 'hasOwnProperty',
            'is', 'isExtensible', 'isFrozen', 'isSealed', 'keys', 'preventExtensions',
            'seal', 'setPrototypeOf', 'values'
        ],
        prototype: ['hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toString', 'valueOf']
    },
    String: {
        static: ['fromCharCode', 'fromCodePoint', 'raw'],
        prototype: [
            'charAt', 'charCodeAt', 'codePointAt', 'concat', 'endsWith', 'includes',
            'indexOf', 'lastIndexOf', 'localeCompare', 'match', 'matchAll', 'normalize',
            'padEnd', 'padStart', 'repeat', 'replace', 'replaceAll', 'search', 'slice',
            'split', 'startsWith', 'substring', 'toLowerCase', 'toUpperCase', 'trim',
            'trimEnd', 'trimStart'
        ]
    },
    Promise: {
        static: ['all', 'allSettled', 'any', 'race', 'reject', 'resolve'],
        prototype: ['catch', 'finally', 'then']
    },
    Date: {
        static: ['now', 'parse', 'UTC'],
        prototype: [
            'getDate', 'getDay', 'getFullYear', 'getHours', 'getMilliseconds', 'getMinutes',
            'getMonth', 'getSeconds', 'getTime', 'getTimezoneOffset', 'getUTCDate',
            'getUTCDay', 'getUTCFullYear', 'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes',
            'getUTCMonth', 'getUTCSeconds', 'setDate', 'setFullYear', 'setHours',
            'setMilliseconds', 'setMinutes', 'setMonth', 'setSeconds', 'setTime',
            'setUTCDate', 'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds',
            'setUTCMinutes', 'setUTCMonth', 'setUTCSeconds', 'toDateString', 'toISOString',
            'toJSON', 'toLocaleDateString', 'toLocaleString', 'toLocaleTimeString',
            'toString', 'toTimeString', 'toUTCString', 'valueOf'
        ]
    }
};

// APIs do browser
const BROWSER_APIS = {
    window: [
        'alert', 'confirm', 'prompt', 'open', 'close', 'focus', 'blur',
        'addEventListener', 'removeEventListener', 'setTimeout', 'clearTimeout',
        'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
        'fetch', 'location', 'history', 'navigator', 'screen', 'localStorage',
        'sessionStorage', 'console'
    ],
    document: [
        'getElementById', 'getElementsByClassName', 'getElementsByTagName',
        'querySelector', 'querySelectorAll', 'createElement', 'createTextNode',
        'addEventListener', 'removeEventListener', 'body', 'head', 'title',
        'cookie', 'domain', 'URL', 'documentElement'
    ],
    localStorage: ['getItem', 'setItem', 'removeItem', 'clear', 'key', 'length'],
    sessionStorage: ['getItem', 'setItem', 'removeItem', 'clear', 'key', 'length'],
    console: ['log', 'info', 'warn', 'error', 'debug', 'trace', 'table', 'group', 'groupEnd'],
    fetch: [] // É uma função, não objeto
};

// APIs do Node.js
const NODE_APIS = {
    fs: [
        'readFile', 'readFileSync', 'writeFile', 'writeFileSync', 'appendFile',
        'appendFileSync', 'unlink', 'unlinkSync', 'mkdir', 'mkdirSync', 'rmdir',
        'rmdirSync', 'stat', 'statSync', 'exists', 'existsSync', 'createReadStream',
        'createWriteStream', 'watch', 'watchFile', 'unwatchFile'
    ],
    path: [
        'join', 'resolve', 'relative', 'dirname', 'basename', 'extname', 'parse',
        'format', 'isAbsolute', 'normalize', 'sep', 'delimiter'
    ],
    process: [
        'argv', 'env', 'exit', 'cwd', 'chdir', 'version', 'versions', 'platform',
        'arch', 'pid', 'ppid', 'title', 'stdout', 'stderr', 'stdin', 'nextTick'
    ],
    os: [
        'platform', 'arch', 'cpus', 'totalmem', 'freemem', 'hostname', 'type',
        'release', 'uptime', 'userInfo', 'homedir', 'tmpdir', 'endianness', 'EOL'
    ]
};

// Métodos comumente alucinados
const COMMON_HALLUCINATIONS = {
    Array: [
        'shuffle', 'random', 'first', 'last', 'isEmpty', 'unique', 'flatten',
        'compact', 'chunk', 'groupBy', 'sortBy', 'sum', 'average', 'min', 'max'
    ],
    Object: [
        'isEmpty', 'clone', 'merge', 'pick', 'omit', 'has', 'get', 'set',
        'deepEqual', 'deepCopy', 'flatten', 'unflatten'
    ],
    String: [
        'format', 'capitalize', 'titleCase', 'camelCase', 'kebabCase', 'snakeCase',
        'reverse', 'shuffle', 'truncate', 'humanize', 'pluralize', 'singularize'
    ],
    Promise: [
        'delay', 'timeout', 'retry', 'map', 'filter', 'reduce', 'series', 'parallel'
    ],
    Date: [
        'addDays', 'addHours', 'addMinutes', 'format', 'isValid', 'isBefore',
        'isAfter', 'isSame', 'diff', 'startOf', 'endOf', 'clone'
    ],
    Math: [
        'clamp', 'lerp', 'map', 'normalize', 'distance', 'angle', 'degrees', 'radians'
    ]
};

// APIs depreciadas
const DEPRECATED_APIS = {
    'escape': 'Use encodeURIComponent() instead',
    'unescape': 'Use decodeURIComponent() instead',
    'String.prototype.substr': 'Use String.prototype.substring() instead',
    'Date.prototype.getYear': 'Use Date.prototype.getFullYear() instead',
    'Date.prototype.setYear': 'Use Date.prototype.setFullYear() instead',
    'arguments.caller': 'Use proper function parameters instead',
    'Function.prototype.caller': 'Deprecated for security reasons',
    'Function.prototype.arguments': 'Use proper function parameters instead'
};

export class JSAPIValidator {
    /**
     * Validar APIs JavaScript/TypeScript
     */
    async validateJSAPIs(
        code: string,
        options: {
            environment?: 'browser' | 'node' | 'both';
            esVersion?: string;
            typescript?: boolean;
            strictMode?: boolean;
        } = {}
    ): Promise<JSAPIValidationResult> {
        const issues: JSAPIIssue[] = [];
        const suggestions: string[] = [];
        
        const { environment = 'both', typescript = false, strictMode = false } = options;
        
        // Detectar métodos alucinados
        this.detectHallucinatedMethods(code, issues, suggestions);
        
        // Detectar APIs depreciadas
        this.detectDeprecatedAPIs(code, issues, suggestions);
        
        // Detectar APIs do ambiente incorreto
        this.detectWrongEnvironmentAPIs(code, environment, issues, suggestions);
        
        // Detectar padrões TypeScript específicos
        if (typescript) {
            this.detectTypeScriptIssues(code, issues, suggestions);
        }
        
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
     * Detectar métodos alucinados
     */
    private detectHallucinatedMethods(
        code: string,
        issues: JSAPIIssue[],
        suggestions: string[]
    ): void {
        // Padrão para capturar chamadas de método: Object.method() ou obj.method()
        const methodCallPattern = /(\w+)\.(\w+)\s*\(/g;
        
        let match;
        while ((match = methodCallPattern.exec(code)) !== null) {
            const objectName = match[1];
            const methodName = match[2];
            
            // Verificar se é um objeto JavaScript nativo
            if (NATIVE_JS_APIS[objectName as keyof typeof NATIVE_JS_APIS]) {
                const apiInfo = NATIVE_JS_APIS[objectName as keyof typeof NATIVE_JS_APIS];
                
                // Verificar se o método existe
                const isValidMethod = apiInfo.static?.includes(methodName) || 
                                    apiInfo.prototype?.includes(methodName);
                
                if (!isValidMethod) {
                    // Verificar se é uma alucinação comum
                    const hallucinatedMethods = COMMON_HALLUCINATIONS[objectName as keyof typeof COMMON_HALLUCINATIONS] || [];
                    
                    if (hallucinatedMethods.includes(methodName)) {
                        issues.push({
                            type: 'hallucination',
                            severity: 'error',
                            message: `${objectName}.${methodName}() não existe no JavaScript nativo`,
                            location: {
                                api: `${objectName}.${methodName}`,
                                context: this.extractContext(code, match.index)
                            },
                            suggestion: this.suggestAlternative(objectName, methodName)
                        });
                        
                        suggestions.push(this.suggestAlternative(objectName, methodName));
                    } else {
                        // Método não reconhecido
                        issues.push({
                            type: 'invalid-method',
                            severity: 'warning',
                            message: `${objectName}.${methodName}() não é um método padrão do JavaScript`,
                            location: {
                                api: `${objectName}.${methodName}`,
                                context: this.extractContext(code, match.index)
                            }
                        });
                    }
                }
            }
        }
        
        // Verificar propriedades alucinadas
        this.detectHallucinatedProperties(code, issues, suggestions);
    }
    
    /**
     * Detectar propriedades alucinadas
     */
    private detectHallucinatedProperties(
        code: string,
        issues: JSAPIIssue[],
        suggestions: string[]
    ): void {
        // Padrões comuns de propriedades alucinadas
        const hallucinatedProperties = [
            {
                pattern: /Array\.prototype\.length/g,
                message: 'Array.prototype.length não existe. Use arr.length diretamente',
                suggestion: 'Use arr.length em uma instância de array'
            },
            {
                pattern: /String\.prototype\.length/g,
                message: 'String.prototype.length não existe. Use str.length diretamente',
                suggestion: 'Use str.length em uma instância de string'
            },
            {
                pattern: /Object\.size/g,
                message: 'Object.size não existe. Use Object.keys(obj).length',
                suggestion: 'Use Object.keys(obj).length para contar propriedades'
            },
            {
                pattern: /Array\.size/g,
                message: 'Array.size não existe. Use array.length',
                suggestion: 'Use array.length para obter o tamanho'
            }
        ];
        
        for (const { pattern, message, suggestion } of hallucinatedProperties) {
            if (pattern.test(code)) {
                issues.push({
                    type: 'hallucination',
                    severity: 'error',
                    message,
                    location: {
                        api: pattern.source,
                    },
                    suggestion
                });
                
                suggestions.push(suggestion);
            }
        }
    }
    
    /**
     * Detectar APIs depreciadas
     */
    private detectDeprecatedAPIs(
        code: string,
        issues: JSAPIIssue[],
        suggestions: string[]
    ): void {
        for (const [api, suggestion] of Object.entries(DEPRECATED_APIS)) {
            if (code.includes(api)) {
                issues.push({
                    type: 'deprecated',
                    severity: 'warning',
                    message: `${api} está depreciado`,
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
     * Detectar APIs do ambiente incorreto
     */
    private detectWrongEnvironmentAPIs(
        code: string,
        environment: string,
        issues: JSAPIIssue[],
        suggestions: string[]
    ): void {
        // APIs específicas do browser em ambiente Node.js
        if (environment === 'node') {
            const browserOnlyAPIs = ['window', 'document', 'localStorage', 'sessionStorage', 'alert'];
            
            for (const api of browserOnlyAPIs) {
                if (code.includes(api)) {
                    issues.push({
                        type: 'wrong-environment',
                        severity: 'error',
                        message: `${api} não está disponível no Node.js`,
                        location: {
                            api,
                            context: 'Node.js environment'
                        },
                        suggestion: this.suggestNodeAlternative(api)
                    });
                }
            }
        }
        
        // APIs específicas do Node.js em ambiente browser
        if (environment === 'browser') {
            const nodeOnlyAPIs = ['fs', 'path', 'os', 'crypto', 'util'];
            
            for (const api of nodeOnlyAPIs) {
                const nodeRequirePattern = new RegExp(`require\\s*\\(\\s*['"\`]${api}['"\`]\\s*\\)`, 'g');
                const nodeImportPattern = new RegExp(`import.*from\\s*['"\`]${api}['"\`]`, 'g');
                
                if (nodeRequirePattern.test(code) || nodeImportPattern.test(code)) {
                    issues.push({
                        type: 'wrong-environment',
                        severity: 'error',
                        message: `Módulo '${api}' não está disponível no browser`,
                        location: {
                            api,
                            context: 'Browser environment'
                        },
                        suggestion: this.suggestBrowserAlternative(api)
                    });
                }
            }
        }
    }
    
    /**
     * Detectar problemas específicos do TypeScript
     */
    private detectTypeScriptIssues(
        code: string,
        issues: JSAPIIssue[],
        suggestions: string[]
    ): void {
        // Tipos alucinados comuns
        const hallucinatedTypes = [
            'StringNumber', 'ArrayObject', 'ObjectArray', 'NumberString',
            'BooleanString', 'FunctionObject', 'PromiseArray'
        ];
        
        for (const type of hallucinatedTypes) {
            const typePattern = new RegExp(`:\\s*${type}\\b`, 'g');
            if (typePattern.test(code)) {
                issues.push({
                    type: 'hallucination',
                    severity: 'error',
                    message: `Tipo '${type}' não existe no TypeScript`,
                    location: {
                        api: type,
                        context: 'TypeScript type annotation'
                    },
                    suggestion: 'Use tipos TypeScript válidos como string, number, object, array'
                });
            }
        }
        
        // Utility types incorretos
        const incorrectUtilityTypes = [
            { pattern: /Partial<.*,.*>/g, message: 'Partial<T> aceita apenas um tipo genérico' },
            { pattern: /Pick<.*>/g, message: 'Pick<T, K> requer dois tipos genéricos' },
            { pattern: /Omit<.*>/g, message: 'Omit<T, K> requer dois tipos genéricos' }
        ];
        
        for (const { pattern, message } of incorrectUtilityTypes) {
            if (pattern.test(code)) {
                issues.push({
                    type: 'invalid-method',
                    severity: 'error',
                    message,
                    location: {
                        api: 'Utility Type'
                    }
                });
            }
        }
    }
    
    /**
     * Sugerir alternativa para métodos alucinados
     */
    private suggestAlternative(objectName: string, methodName: string): string {
        const alternatives: Record<string, Record<string, string>> = {
            Array: {
                shuffle: 'Use array.sort(() => Math.random() - 0.5) ou biblioteca como lodash',
                first: 'Use array[0]',
                last: 'Use array[array.length - 1]',
                isEmpty: 'Use array.length === 0',
                unique: 'Use [...new Set(array)]',
                flatten: 'Use array.flat()',
                sum: 'Use array.reduce((a, b) => a + b, 0)',
                average: 'Use array.reduce((a, b) => a + b, 0) / array.length'
            },
            Object: {
                isEmpty: 'Use Object.keys(obj).length === 0',
                clone: 'Use {...obj} ou structuredClone(obj)',
                merge: 'Use Object.assign({}, obj1, obj2) ou {...obj1, ...obj2}',
                has: 'Use Object.hasOwnProperty.call(obj, key)'
            },
            String: {
                format: 'Use template literals ou biblioteca como sprintf-js',
                capitalize: 'Use str.charAt(0).toUpperCase() + str.slice(1)',
                reverse: 'Use str.split("").reverse().join("")'
            },
            Promise: {
                delay: 'Use new Promise(resolve => setTimeout(resolve, ms))',
                map: 'Use Promise.all(array.map(async item => ...))'
            }
        };
        
        return alternatives[objectName]?.[methodName] || 
               `Método ${objectName}.${methodName}() não existe no JavaScript nativo`;
    }
    
    /**
     * Sugerir alternativa para APIs Node.js no browser
     */
    private suggestBrowserAlternative(api: string): string {
        const alternatives: Record<string, string> = {
            fs: 'Use File API ou bibliotecas como browser-fs-access',
            path: 'Use bibliotecas como path-browserify',
            os: 'Use navigator.platform e outras APIs do browser',
            crypto: 'Use Web Crypto API (window.crypto)',
            util: 'Use bibliotecas que funcionam no browser'
        };
        
        return alternatives[api] || `Use alternativas que funcionem no browser`;
    }
    
    /**
     * Sugerir alternativa para APIs browser no Node.js
     */
    private suggestNodeAlternative(api: string): string {
        const alternatives: Record<string, string> = {
            window: 'Use global ou process no Node.js',
            document: 'Use bibliotecas como jsdom para simulação',
            localStorage: 'Use bibliotecas como node-localstorage',
            alert: 'Use console.log() ou bibliotecas como prompts'
        };
        
        return alternatives[api] || `Use alternativas do Node.js`;
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
            currentPos += lines[i].length + 1; // +1 para o \n
        }
        
        return '';
    }
    
    /**
     * Calcular pontuação de confiança
     */
    private calculateScore(issues: JSAPIIssue[]): number {
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

// Export singleton
export const jsAPIValidator = new JSAPIValidator();