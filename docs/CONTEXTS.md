# Sistema de Contextos - MCP Code Validator

O MCP Code Validator agora suporta **contextos de projeto**, permitindo que você use o mesmo servidor para múltiplos projetos sem misturar os dados.

## 🎯 O que são Contextos?

Contextos são namespaces isolados no Neo4j que separam os dados de diferentes projetos. Cada contexto mantém seu próprio conjunto de:
- ✅ Arquivos indexados
- ✅ Funções e classes  
- ✅ Componentes React
- ✅ Hooks customizados
- ✅ Padrões Next.js
- ✅ Dependências de bibliotecas

## 🚀 Como Usar Contextos

### 1. **Configuração Básica**
Todos os tools agora aceitam um parâmetro opcional `context`:

```typescript
// Indexar arquivo no contexto "frontend"
indexFile({
  filePath: "src/components/Button.tsx",
  content: "...",
  language: "typescript",
  context: "frontend"
})

// Validar código no contexto "backend-api"  
validateCode({
  code: "function processUser() {...}",
  language: "typescript", 
  context: "backend-api"
})
```

### 2. **Gerenciar Contextos**
Use o tool `manageContexts` para administrar contextos:

```typescript
// Listar todos os contextos
manageContexts({ action: "list" })

// Criar novo contexto (opcional - é criado automaticamente)
manageContexts({ action: "create", context: "my-project" })

// Limpar dados de um contexto
manageContexts({ action: "clear", context: "old-project" })

// Deletar contexto completamente
manageContexts({ action: "delete", context: "temp-project" })
```

## 📁 Exemplos de Uso

### **Cenário 1: Projetos Separados**
```typescript
// Projeto Frontend React
indexFile({
  filePath: "src/components/Header.tsx",
  content: "export const Header = () => {...}",
  language: "typescript",
  context: "ecommerce-frontend"
})

// Projeto Backend API
indexFile({
  filePath: "controllers/UserController.ts", 
  content: "export class UserController {...}",
  language: "typescript",
  context: "ecommerce-backend"
})
```

### **Cenário 2: Múltiplos Clientes**
```typescript
// Cliente A
indexFile({
  filePath: "src/utils/helpers.ts",
  content: "export function validateEmail() {...}",
  language: "typescript", 
  context: "client-a"
})

// Cliente B  
indexFile({
  filePath: "src/utils/helpers.ts",
  content: "export function validateEmail() {...}",
  language: "typescript",
  context: "client-b"
})
```

### **Cenário 3: Versões/Branches**
```typescript
// Branch main
indexFile({
  filePath: "src/auth/login.ts",
  content: "...",
  language: "typescript",
  context: "main"
})

// Branch feature
indexFile({
  filePath: "src/auth/login.ts", 
  content: "...",
  language: "typescript",
  context: "feature-oauth"
})
```

## 🔍 Verificar Status dos Contextos

O comando `manageContexts({ action: "list" })` retorna:

```
Available Contexts:

📁 default: 15 files, 42 functions, 8 classes, 12 components
📁 frontend: 23 files, 67 functions, 3 classes, 28 components  
📁 backend-api: 31 files, 89 functions, 15 classes, 0 components
📁 mobile-app: 18 files, 51 functions, 12 classes, 22 components

Total: 4 contexts
```

## ⚙️ Contexto Padrão

- **Contexto padrão**: `"default"`
- Se você não especificar `context`, será usado `"default"`
- Compatível com dados existentes (dados antigos ficam em `"default"`)

## 🛠️ Tools que Suportam Contextos

Todos os tools foram atualizados para suportar contextos:

| Tool | Suporte a Context | Descrição |
|------|-------------------|-----------|
| `indexFile` | ✅ | Indexa arquivos no contexto especificado |
| `indexFunctions` | ✅ | Indexa funções no contexto |
| `indexDependencies` | ✅ | Indexa dependências no contexto |
| `validateCode` | ✅ | Valida código contra contexto específico |
| `validateFile` | ✅ | Valida arquivo no contexto |
| `detectHallucinations` | ✅ | Detecta alucinações no contexto |
| `validateCodeQuality` | ✅ | Analisa qualidade no contexto |
| `suggestImprovements` | ✅ | Sugere melhorias baseadas no contexto |
| `validateReactHooks` | ✅ | Valida hooks no contexto |
| `manageContexts` | ✅ | Gerencia contextos (novo) |

## 🎛️ Configuração no Claude Code

### Opção 1: Context por Projeto
Crie um arquivo `.claude/config.json` em cada projeto:

```json
{
  "mcpServers": {
    "code-validator": {
      "command": "/path/to/mcp-code-validator/claude-mcp.sh",
      "cwd": "/path/to/mcp-code-validator",
      "env": {
        "MCP_CONTEXT": "meu-projeto"
      }
    }
  }
}
```

### Opção 2: Context Manual
Sempre especifique o `context` ao usar os tools:

```typescript
// No Claude Code CLI
indexFile({
  filePath: "src/App.tsx",
  content: "...",
  language: "typescript", 
  context: "react-dashboard"
})
```

## 🔒 Isolamento de Dados

Cada contexto é completamente isolado:

- ❌ Funções do contexto "A" não aparecem ao validar código do contexto "B"
- ❌ Dependências do contexto "frontend" não interferem no "backend"
- ❌ Componentes React de um projeto não aparecem em outro
- ✅ Cada contexto mantém sua própria base de conhecimento

## 📊 Benefícios

1. **Múltiplos Projetos**: Use um servidor para vários projetos
2. **Dados Limpos**: Não há contaminação cruzada entre projetos
3. **Performance**: Queries mais rápidas (menos dados para pesquisar)
4. **Organização**: Fácil de gerenciar e limpar projetos antigos
5. **Flexibilidade**: Contextos podem representar projetos, clientes, branches, etc.

## 🧹 Manutenção

### Limpar Projeto Antigo
```typescript
manageContexts({ action: "clear", context: "projeto-antigo" })
```

### Backup de Contexto
Use queries Neo4j para exportar dados de um contexto específico:

```cypher
MATCH (n {context: "meu-projeto"})
RETURN n
```

### Migrar Contexto
1. Exporte dados do contexto antigo
2. Re-indexe arquivos no novo contexto
3. Delete contexto antigo

## 🔧 Troubleshooting

### "Context não encontrado"
- Contextos são criados automaticamente ao indexar o primeiro arquivo
- Verifique o nome do contexto (case-sensitive)

### "Dados misturados"
- Verifique se está especificando o contexto correto em todos os tools
- Use `manageContexts({ action: "list" })` para ver contextos disponíveis

### "Performance lenta"
- Contextos menores = queries mais rápidas
- Considere dividir projetos grandes em sub-contextos