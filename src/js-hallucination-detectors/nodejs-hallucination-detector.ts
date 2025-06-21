/**
 * Detector de alucinações específico para Node.js e frameworks backend
 * Foca em Express, APIs built-in e padrões comumente alucinados
 */

export interface NodeJSHallucinationResult {
    valid: boolean;
    issues: NodeJSHallucinationIssue[];
    score: number;
    suggestions: string[];
}

export interface NodeJSHallucinationIssue {
    type: 'invalid-builtin' | 'invalid-framework-api' | 'deprecated-api' | 'async-pattern' | 'anti-pattern';
    severity: 'error' | 'warning' | 'info';
    message: string;
    location: {
        line?: number;
        module?: string;
        api?: string;
        context?: string;
    };
    suggestion: string;
}

// Módulos built-in válidos do Node.js
const VALID_BUILTIN_MODULES = new Set([
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
    'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http',
    'http2', 'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
    'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
    'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty', 'url',
    'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
]);

// APIs built-in comumente alucinadas
const HALLUCINATED_BUILTIN_APIS = {
    // File System alucinado
    'fs.exists': {
        message: 'fs.exists está depreciado. Use fs.existsSync ou fs.access',
        suggestion: 'Use fs.existsSync() para verificação síncrona ou fs.access() para assíncrona'
    },
    'fs.readFileAsync': {
        message: 'fs.readFileAsync não existe',
        suggestion: 'Use fs.promises.readFile() ou promisify(fs.readFile)'
    },
    'fs.writeFileAsync': {
        message: 'fs.writeFileAsync não existe',
        suggestion: 'Use fs.promises.writeFile() ou promisify(fs.writeFile)'
    },
    'fs.mkdirAsync': {
        message: 'fs.mkdirAsync não existe',
        suggestion: 'Use fs.promises.mkdir() ou promisify(fs.mkdir)'
    },
    
    // HTTP alucinado
    'http.request.json': {
        message: 'http.request não tem método json()',
        suggestion: 'Parse response body manualmente: JSON.parse(body)'
    },
    'http.get.json': {
        message: 'http.get não tem método json()',
        suggestion: 'Parse response body manualmente: JSON.parse(body)'
    },
    
    // Process alucinado
    'process.args': {
        message: 'process.args não existe',
        suggestion: 'Use process.argv'
    },
    'process.environment': {
        message: 'process.environment não existe',
        suggestion: 'Use process.env'
    },
    'process.cwd()': { // Note: cwd() existe, mas frequentemente usado incorretamente
        message: 'Verificar uso correto de process.cwd()',
        suggestion: 'process.cwd() retorna string, não precisa de await'
    },
    
    // Path alucinado
    'path.combine': {
        message: 'path.combine não existe',
        suggestion: 'Use path.join() ou path.resolve()'
    },
    'path.getExtension': {
        message: 'path.getExtension não existe',
        suggestion: 'Use path.extname()'
    },
    'path.getDirectory': {
        message: 'path.getDirectory não existe',
        suggestion: 'Use path.dirname()'
    },
    
    // Crypto alucinado
    'crypto.md5': {
        message: 'crypto.md5 não existe como método direto',
        suggestion: 'Use crypto.createHash("md5")'
    },
    'crypto.sha256': {
        message: 'crypto.sha256 não existe como método direto',
        suggestion: 'Use crypto.createHash("sha256")'
    },
    'crypto.encrypt': {
        message: 'crypto.encrypt não existe',
        suggestion: 'Use crypto.createCipher() ou crypto.createCipheriv()'
    },
    'crypto.decrypt': {
        message: 'crypto.decrypt não existe',
        suggestion: 'Use crypto.createDecipher() ou crypto.createDecipheriv()'
    }
};

// APIs Express comumente alucinadas
const HALLUCINATED_EXPRESS_APIS = {
    // Middleware alucinado
    'app.middleware': {
        message: 'app.middleware() não existe',
        suggestion: 'Use app.use() para adicionar middleware'
    },
    'express.bodyParser': {
        message: 'express.bodyParser foi removido no Express 4+',
        suggestion: 'Use express.json() e express.urlencoded()'
    },
    'express.cookieParser': {
        message: 'express.cookieParser foi removido no Express 4+',
        suggestion: 'Use cookie-parser middleware separadamente'
    },
    'express.session': {
        message: 'express.session foi removido no Express 4+',
        suggestion: 'Use express-session middleware separadamente'
    },
    
    // Request/Response alucinado
    'req.body.get': {
        message: 'req.body.get() não existe',
        suggestion: 'req.body é um objeto, acesse propriedades diretamente: req.body.property'
    },
    'req.query.get': {
        message: 'req.query.get() não existe',
        suggestion: 'req.query é um objeto, acesse propriedades diretamente: req.query.property'
    },
    'req.params.get': {
        message: 'req.params.get() não existe',
        suggestion: 'req.params é um objeto, acesse propriedades diretamente: req.params.property'
    },
    'res.send.json': {
        message: 'res.send.json() não existe',
        suggestion: 'Use res.json() para enviar JSON'
    },
    'res.render.json': {
        message: 'res.render.json() não existe',
        suggestion: 'Use res.json() para JSON ou res.render() para templates'
    },
    
    // Router alucinado
    'router.route.all': {
        message: 'Uso incorreto de router.route()',
        suggestion: 'Use router.all() ou router.route().all()'
    },
    'app.route.middleware': {
        message: 'app.route.middleware() não existe',
        suggestion: 'Use app.use() para middleware ou router.use()'
    },
    
    // Error handling alucinado
    'app.error': {
        message: 'app.error() não existe',
        suggestion: 'Use app.use() com error middleware de 4 parâmetros'
    },
    'express.errorHandler': {
        message: 'express.errorHandler foi removido',
        suggestion: 'Implemente error middleware personalizado'
    }
};

// Padrões async/await incorretos
const INCORRECT_ASYNC_PATTERNS = [
    {
        pattern: /await\s+require\s*\(/g,
        message: 'require() é síncrono, não precisa de await',
        suggestion: 'Remove await: const module = require("module")'
    },
    {
        pattern: /await\s+process\.cwd\s*\(\)/g,
        message: 'process.cwd() é síncrono, não precisa de await',
        suggestion: 'Remove await: const cwd = process.cwd()'
    },
    {
        pattern: /\.then\s*\(\s*async/g,
        message: 'Misturando async/await com .then()',
        suggestion: 'Use apenas async/await ou apenas .then(), não misture'
    },
    {
        pattern: /fs\.readFileSync\s*\([^)]*\)\.then/g,
        message: 'Métodos síncronos não retornam Promise',
        suggestion: 'Use fs.readFile() para assíncrono ou remova .then()'
    }
];

// APIs depreciadas do Node.js
const DEPRECATED_NODEJS_APIS = {
    'fs.exists': 'Use fs.existsSync() ou fs.access()',
    'crypto.createCredentials': 'Use tls.createSecureContext()',
    'crypto.Credentials': 'Use tls.SecureContext',
    'domain': 'Domain module está depreciado, use AsyncLocalStorage',
    'punycode': 'Use String.prototype.normalize() ou bibliotecas externas',
    'util.print': 'Use console.log()',
    'util.puts': 'Use console.log()',
    'util.debug': 'Use console.error()',
    'util.error': 'Use console.error()',
    'util.pump': 'Use stream.pipeline()',
    'util._extend': 'Use Object.assign()',
    'buffer.Buffer': 'Use Buffer.from(), Buffer.alloc() ou Buffer.allocUnsafe()'
};

export class NodeJSHallucinationDetector {
    /**
     * Detectar alucinações em código Node.js
     */
    async detectNodeJSHallucinations(
        code: string,
        options: {
            nodeVersion?: string;
            framework?: 'express' | 'fastify' | 'koa' | 'nest';
            typescript?: boolean;
            strictMode?: boolean;
        } = {}
    ): Promise<NodeJSHallucinationResult> {
        const issues: NodeJSHallucinationIssue[] = [];
        const suggestions: string[] = [];
        
        const { framework, nodeVersion } = options;
        
        // Detectar APIs built-in alucinadas
        this.detectHallucinatedBuiltinAPIs(code, issues, suggestions);
        
        // Detectar padrões async incorretos
        this.detectIncorrectAsyncPatterns(code, issues, suggestions);
        
        // Detectar APIs depreciadas
        this.detectDeprecatedAPIs(code, nodeVersion, issues, suggestions);
        
        // Detectar problemas específicos do framework
        if (framework === 'express') {
            this.detectExpressHallucinations(code, issues, suggestions);
        }
        
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
     * Detectar APIs built-in alucinadas
     */
    private detectHallucinatedBuiltinAPIs(
        code: string,
        issues: NodeJSHallucinationIssue[],
        suggestions: string[]
    ): void {
        for (const [api, info] of Object.entries(HALLUCINATED_BUILTIN_APIS)) {
            if (code.includes(api)) {
                issues.push({
                    type: 'invalid-builtin',
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
        
        // Verificar módulos built-in inexistentes
        const requirePattern = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        let match;
        while ((match = requirePattern.exec(code)) !== null) {
            const moduleName = match[1];
            
            // Verificar se é um módulo built-in que não existe
            if (moduleName.startsWith('node:') || !moduleName.includes('/')) {
                const cleanModuleName = moduleName.replace('node:', '');
                
                if (!VALID_BUILTIN_MODULES.has(cleanModuleName) && 
                    !this.isThirdPartyModule(cleanModuleName)) {
                    
                    issues.push({
                        type: 'invalid-builtin',
                        severity: 'error',
                        message: `Módulo built-in '${moduleName}' não existe`,
                        location: {
                            module: moduleName,
                            context: this.extractContext(code, match.index)
                        },
                        suggestion: `Módulos built-in válidos: ${Array.from(VALID_BUILTIN_MODULES).join(', ')}`
                    });
                }
            }
        }
    }
    
    /**
     * Detectar padrões async incorretos
     */
    private detectIncorrectAsyncPatterns(
        code: string,
        issues: NodeJSHallucinationIssue[],
        suggestions: string[]
    ): void {
        for (const { pattern, message, suggestion } of INCORRECT_ASYNC_PATTERNS) {
            if (pattern.test(code)) {
                issues.push({
                    type: 'async-pattern',
                    severity: 'error',
                    message,
                    location: {
                        context: 'Async pattern issue'
                    },
                    suggestion
                });
                
                suggestions.push(suggestion);
            }
        }
        
        // Detectar callback hell
        const nestedCallbackPattern = /\{\s*[^}]*\{\s*[^}]*\{\s*[^}]*\{/g;
        if (nestedCallbackPattern.test(code)) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'Possível callback hell detectado',
                location: {
                    context: 'Nested callbacks'
                },
                suggestion: 'Considere usar async/await ou Promises para evitar callback hell'
            });
        }
        
        // Detectar Promise sem catch
        const promiseWithoutCatch = /\.(then\s*\([^)]*\))(?!\s*\.catch)/g;
        if (promiseWithoutCatch.test(code)) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'Promise sem .catch() pode causar unhandled rejections',
                location: {
                    context: 'Promise without catch'
                },
                suggestion: 'Sempre adicione .catch() ou use try/catch com async/await'
            });
        }
    }
    
    /**
     * Detectar APIs depreciadas
     */
    private detectDeprecatedAPIs(
        code: string,
        nodeVersion: string | undefined,
        issues: NodeJSHallucinationIssue[],
        suggestions: string[]
    ): void {
        for (const [api, suggestion] of Object.entries(DEPRECATED_NODEJS_APIS)) {
            if (code.includes(api)) {
                issues.push({
                    type: 'deprecated-api',
                    severity: 'warning',
                    message: `${api} está depreciado no Node.js`,
                    location: {
                        api
                    },
                    suggestion
                });
                
                suggestions.push(suggestion);
            }
        }
        
        // Verificar new Buffer() (depreciado)
        if (code.includes('new Buffer(')) {
            issues.push({
                type: 'deprecated-api',
                severity: 'warning',
                message: 'new Buffer() está depreciado',
                location: {
                    api: 'new Buffer()'
                },
                suggestion: 'Use Buffer.from(), Buffer.alloc() ou Buffer.allocUnsafe()'
            });
        }
    }
    
    /**
     * Detectar alucinações específicas do Express
     */
    private detectExpressHallucinations(
        code: string,
        issues: NodeJSHallucinationIssue[],
        suggestions: string[]
    ): void {
        for (const [api, info] of Object.entries(HALLUCINATED_EXPRESS_APIS)) {
            if (code.includes(api)) {
                issues.push({
                    type: 'invalid-framework-api',
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
        
        // Detectar middleware sem next()
        const middlewarePattern = /app\.use\s*\(\s*function\s*\([^)]*\)\s*\{[^}]*\}/g;
        let match;
        while ((match = middlewarePattern.exec(code)) !== null) {
            const middlewareBody = match[0];
            if (!middlewareBody.includes('next()') && !middlewareBody.includes('res.')) {
                issues.push({
                    type: 'anti-pattern',
                    severity: 'warning',
                    message: 'Middleware pode estar faltando next() call',
                    location: {
                        context: 'Middleware without next()'
                    },
                    suggestion: 'Chame next() para continuar para o próximo middleware'
                });
            }
        }
        
        // Detectar app.listen sem callback
        if (code.includes('app.listen') && !code.match(/app\.listen\s*\([^)]*,\s*[^)]*\)/)) {
            issues.push({
                type: 'anti-pattern',
                severity: 'info',
                message: 'app.listen sem callback pode dificultar debugging',
                location: {
                    context: 'app.listen without callback'
                },
                suggestion: 'Adicione callback: app.listen(port, () => console.log(`Server running on port ${port}`))'
            });
        }
    }
    
    /**
     * Detectar anti-patterns gerais
     */
    private detectAntiPatterns(
        code: string,
        issues: NodeJSHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Usar __dirname com import (ES modules)
        if (code.includes('import ') && code.includes('__dirname')) {
            issues.push({
                type: 'anti-pattern',
                severity: 'error',
                message: '__dirname não está disponível em ES modules',
                location: {
                    context: '__dirname in ES modules'
                },
                suggestion: 'Use import.meta.url: const __dirname = path.dirname(fileURLToPath(import.meta.url))'
            });
        }
        
        // Require em ES modules
        if (code.includes('import ') && code.includes('require(')) {
            issues.push({
                type: 'anti-pattern',
                severity: 'error',
                message: 'Misturando import e require',
                location: {
                    context: 'Mixed import/require'
                },
                suggestion: 'Use apenas import em ES modules ou createRequire() para compatibilidade'
            });
        }
        
        // Sync methods em async context
        const syncInAsync = /async\s+function[^{]*{[^}]*Sync\s*\(/g;
        if (syncInAsync.test(code)) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'Métodos síncronos em função async podem bloquear event loop',
                location: {
                    context: 'Sync methods in async function'
                },
                suggestion: 'Use versões assíncronas dos métodos em funções async'
            });
        }
        
        // process.exit em middleware
        if (code.includes('process.exit') && (code.includes('app.use') || code.includes('router.'))) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'process.exit() em middleware pode interromper outras requisições',
                location: {
                    context: 'process.exit in middleware'
                },
                suggestion: 'Use return ou throw error em vez de process.exit()'
            });
        }
    }
    
    /**
     * Verificar se é módulo third-party conhecido
     */
    private isThirdPartyModule(moduleName: string): boolean {
        const commonThirdParty = [
            'express', 'lodash', 'moment', 'axios', 'react', 'vue', 'angular',
            'mongodb', 'mongoose', 'sequelize', 'jwt', 'bcrypt', 'cors',
            'helmet', 'morgan', 'dotenv', 'nodemon', 'jest', 'mocha', 'chai'
        ];
        
        return commonThirdParty.includes(moduleName) || 
               moduleName.startsWith('@') || 
               moduleName.includes('-') ||
               moduleName.includes('.');
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
    private calculateScore(issues: NodeJSHallucinationIssue[]): number {
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
export const nodeJSHallucinationDetector = new NodeJSHallucinationDetector();