# Proposta de Detecção de Alucinações para JavaScript/TypeScript

## Resumo Executivo

Baseado em pesquisas sobre alucinações em geradores de código AI, esta proposta foca especificamente em melhorias para detecção de alucinações em JavaScript e TypeScript, tanto para frontend quanto backend.

## Análise Atual

O MCP Code Validator já possui `detectHallucinations`, mas pesquisas mostram que:
- **21,7% dos pacotes recomendados** por LLMs não existem no npm
- **JavaScript** é particularmente vulnerável devido à tipagem dinâmica
- **Frameworks** (React, Vue, Node.js) têm padrões específicos frequentemente alucinados

## Novas Ferramentas Propostas

### 1. `verifyNpmPackages`
**Objetivo**: Verificação em tempo real de pacotes npm

```typescript
inputSchema: {
    packages: z.array(z.object({
        name: z.string(),
        version: z.string().optional()
    })),
    checkPopularity: z.boolean().default(true),
    detectTyposquatting: z.boolean().default(true)
}
```

**Funcionalidades**:
- Consulta direta ao registry npm
- Detecta typosquatting (ex: `expres` vs `express`)
- Verifica popularidade e manutenção
- Identifica padrões suspeitos (`magic-`, `auto-`, `ai-`)

### 2. `validateJavaScriptAPIs`
**Objetivo**: Validação de APIs específicas do JavaScript/TypeScript

```typescript
inputSchema: {
    code: z.string(),
    environment: z.enum(['browser', 'node', 'both']).default('both'),
    esVersion: z.string().optional().describe('ES2015, ES2020, etc.'),
    strictMode: z.boolean().default(false)
}
```

**Validações**:
- **APIs Browser**: `document`, `window`, `localStorage`, DOM methods
- **APIs Node.js**: `fs`, `path`, `process`, módulos built-in
- **JavaScript nativo**: métodos Array, Object, Promise
- **TypeScript**: tipos, interfaces, decorators

### 3. `validateReactPatterns`
**Objetivo**: Detecção específica para React

```typescript
inputSchema: {
    code: z.string(),
    reactVersion: z.string().optional(),
    includeHooks: z.boolean().default(true),
    checkDeprecated: z.boolean().default(true)
}
```

**Detecta**:
- **Hooks alucinados**: `useAsync`, `useFetch`, `usePromise`
- **Regras dos Hooks**: chamadas condicionais, loops
- **APIs inexistentes**: `React.fetch`, `React.ajax`
- **Lifecycle alucinados**: `componentDidReceiveProps`

### 4. `validateVuePatterns`
**Objetivo**: Detecção específica para Vue.js

```typescript
inputSchema: {
    code: z.string(),
    vueVersion: z.enum(['2', '3']).default('3'),
    compositionAPI: z.boolean().default(true)
}
```

**Detecta**:
- **Composition API**: `ref`, `reactive`, `computed` usage
- **Diretivas alucinadas**: `v-model-lazy`, `v-show-if`
- **Lifecycle alucinados**: `onBeforeCreate`
- **APIs inexistentes**: `Vue.fetch`, `Vue.http`

### 5. `validateNodeJSPatterns`
**Objetivo**: Detecção para Node.js e frameworks backend

```typescript
inputSchema: {
    code: z.string(),
    framework: z.enum(['express', 'fastify', 'koa', 'nest']).optional(),
    nodeVersion: z.string().optional()
}
```

**Detecta**:
- **Express**: middlewares inexistentes, métodos alucinados
- **Módulos built-in**: versões corretas de APIs
- **Async/Await**: padrões incorretos
- **Streams**: uso inadequado de APIs

### 6. `detectSecurityVulnerabilities`
**Objetivo**: Vulnerabilidades específicas de JS/TS

```typescript
inputSchema: {
    code: z.string(),
    framework: z.string().optional(),
    checkXSS: z.boolean().default(true),
    checkInjection: z.boolean().default(true)
}
```

**Detecta**:
- **XSS**: `innerHTML`, `dangerouslySetInnerHTML`
- **Injection**: template strings em queries
- **Eval**: uso perigoso de `eval`, `Function`
- **Prototype pollution**: `Object.assign` sem validação

### 7. `validateTypeScriptPatterns`
**Objetivo**: Validação específica de TypeScript

```typescript
inputSchema: {
    code: z.string(),
    tsVersion: z.string().optional(),
    strict: z.boolean().default(true)
}
```

**Detecta**:
- **Tipos alucinados**: `StringNumber`, `ArrayObject`
- **Utility types**: uso incorreto de `Partial`, `Pick`
- **Decorators**: versões e sintaxe correta
- **Generics**: constraintes inexistentes

### 8. `validateJestPatterns`
**Objetivo**: Detecção para testing frameworks

```typescript
inputSchema: {
    code: z.string(),
    framework: z.enum(['jest', 'vitest', 'mocha']).default('jest')
}
```

**Detecta**:
- **Matchers alucinados**: `toBeValidEmail`, `toBePositive`
- **Setup incorreto**: hooks inexistentes
- **Mocking**: APIs que não existem

## Padrões Específicos de Alucinação

### Frontend (React/Vue/Angular)
```javascript
// ALUCINAÇÕES COMUNS:
useAsync() // Hook que não existe
useFetch() // Hook que não existe
React.fetch() // API que não existe
Vue.http() // API removida
$http // Angular 1.x em Angular 2+
```

### Backend (Node.js/Express)
```javascript
// ALUCINAÇÕES COMUNS:
app.middleware() // Método que não existe
express.bodyParser() // Middleware removido
req.body.get() // Método que não existe
mongoose.connect().then() // API incorreta
```

### JavaScript Nativo
```javascript
// ALUCINAÇÕES COMUNS:
Array.prototype.shuffle() // Método que não existe
String.prototype.format() // Método que não existe
Object.isEmpty() // Método que não existe
Promise.delay() // Não é nativo
```

## Implementação Técnica

### 1. Base de Dados de APIs
```typescript
interface APIDatabase {
    browser: {
        [version: string]: string[];
    };
    node: {
        [version: string]: string[];
    };
    frameworks: {
        react: {
            [version: string]: {
                hooks: string[];
                methods: string[];
                deprecated: string[];
            };
        };
        vue: { /* similar */ };
        express: { /* similar */ };
    };
}
```

### 2. Verificador de Pacotes NPM
```typescript
class NpmVerifier {
    async checkPackage(name: string): Promise<{
        exists: boolean;
        downloads: number;
        lastUpdate: Date;
        isSuspicious: boolean;
        alternatives?: string[];
    }> {
        // Implementação real da verificação
    }
}
```

### 3. Sistema de Pontuação
```typescript
interface HallucinationScore {
    overall: number; // 0-100
    breakdown: {
        packageScore: number;
        apiScore: number;
        syntaxScore: number;
        securityScore: number;
    };
    confidence: number;
}
```

## Casos de Uso Específicos

### 1. Verificação de Pacotes
```javascript
// Código gerado por AI:
import { magicValidator } from 'auto-validator';
import { smartHttp } from 'ai-fetch';

// DETECTA: Pacotes que não existem no npm
// SUGERE: Alternativas reais como 'joi', 'axios'
```

### 2. Validação de Hooks React
```javascript
// Código gerado por AI:
function Component() {
    const data = useAsync(fetchData); // ❌ Hook alucinado
    const promise = usePromise(api.call); // ❌ Hook alucinado
    
    // SUGERE: useEffect + useState
}
```

### 3. APIs Node.js
```javascript
// Código gerado por AI:
const fs = require('fs');
fs.readFileSync().then(); // ❌ Método síncrono não retorna Promise

// DETECTA: API inconsistente
// SUGERE: fs.readFile() ou await fs.promises.readFile()
```

## Métricas de Sucesso

1. **Detecção de Pacotes**: >95% de pacotes alucinados detectados
2. **APIs JavaScript**: >90% de métodos inexistentes identificados
3. **Frameworks**: >85% de padrões incorretos detectados
4. **Falsos Positivos**: <5% de código legítimo flagado
5. **Tempo de Resposta**: <1 segundo para análise

## Benefícios Esperados

1. **Redução de Bugs**: 80% menos bugs relacionados a APIs inexistentes
2. **Segurança**: Detecção precoce de vulnerabilidades JS
3. **Produtividade**: Feedback imediato sobre código gerado
4. **Qualidade**: Adesão a melhores práticas do ecossistema JS

## Roadmap de Implementação

### Fase 1 (Semana 1-2): Infraestrutura
- Sistema de verificação npm
- Base de dados de APIs JavaScript
- Engine de pontuação de confiança

### Fase 2 (Semana 3-4): Frontend
- Validador React (hooks, APIs, padrões)
- Validador Vue (composition API, diretivas)
- Detector de XSS e vulnerabilidades frontend

### Fase 3 (Semana 5-6): Backend
- Validador Node.js (built-ins, frameworks)
- Validador Express/Fastify
- Detector de injection e vulnerabilidades backend

### Fase 4 (Semana 7-8): TypeScript e Testes
- Validador TypeScript específico
- Validador Jest/testing frameworks
- Integração e otimização final

## Conclusão

Esta proposta focada em JavaScript/TypeScript oferece detecção específica e precisa de alucinações no ecossistema mais usado para desenvolvimento web, cobrindo tanto frontend (React, Vue) quanto backend (Node.js, Express), com validação em tempo real de pacotes npm e APIs.