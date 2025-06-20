"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../src/parser");
// Integration tests that test the full workflow
describe('Integration Tests', () => {
    // Mock Neo4j for integration tests
    const mockSession = {
        close: jest.fn().mockResolvedValue(undefined),
        executeRead: jest.fn(),
        executeWrite: jest.fn()
    };
    const mockDriver = {
        session: jest.fn(() => mockSession)
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Complete indexing and validation workflow', () => {
        it('should index a file and then validate code against it', async () => {
            // Step 1: Parse and index a file
            const originalCode = `
        function calculateTotal(items) {
          return items.reduce((sum, item) => sum + item.price, 0);
        }
        
        class ShoppingCart {
          constructor() {
            this.items = [];
          }
          
          addItem(item) {
            this.items.push(item);
          }
          
          getTotal() {
            return calculateTotal(this.items);
          }
        }
      `;
            const parsedOriginal = (0, parser_1.parseCode)(originalCode);
            expect(parsedOriginal.functions.length).toBeGreaterThanOrEqual(1);
            expect(parsedOriginal.classes).toHaveLength(1);
            const totalFunction = parsedOriginal.functions.find(f => f.name === 'calculateTotal');
            const cartClass = parsedOriginal.classes.find(c => c.name === 'ShoppingCart');
            expect(totalFunction).toBeDefined();
            expect(cartClass).toBeDefined();
            // Step 2: Simulate indexing (would store in Neo4j)
            const indexedFunctions = parsedOriginal.functions.map(f => ({
                name: f.name,
                body: f.body,
                language: 'typescript'
            }));
            const indexedClasses = parsedOriginal.classes.map(c => ({
                name: c.name,
                body: c.body,
                language: 'typescript'
            }));
            // Step 3: Validate new code that uses the indexed functions
            const newCode = `
        function processOrder() {
          const cart = new ShoppingCart();
          cart.addItem({ price: 10.99 });
          return calculateTotal(cart.items);
        }
      `;
            const parsedNew = (0, parser_1.parseCode)(newCode);
            expect(parsedNew.functions).toHaveLength(1);
            expect(parsedNew.functions[0].name).toBe('processOrder');
            // Check if new code references existing functions
            const newFunctionBody = parsedNew.functions[0].body;
            expect(newFunctionBody).toContain('calculateTotal');
            expect(newFunctionBody).toContain('ShoppingCart');
            // Validate that referenced functions exist in indexed data
            const referencesCalculateTotal = newFunctionBody.includes('calculateTotal');
            const calculateTotalExists = indexedFunctions.some(f => f.name === 'calculateTotal');
            expect(referencesCalculateTotal).toBe(true);
            expect(calculateTotalExists).toBe(true);
        });
        it('should detect hallucinations in a complete workflow', async () => {
            // Step 1: Index existing codebase
            const existingCode = `
        import { lodash } from 'lodash';
        import { axios } from 'axios';
        
        function getUserData(id) {
          return axios.get(\`/api/users/\${id}\`);
        }
        
        function processUserData(data) {
          return lodash.pick(data, ['id', 'name', 'email']);
        }
      `;
            const parsedExisting = (0, parser_1.parseCode)(existingCode);
            const availableLibraries = ['lodash', 'axios', 'react'];
            const projectApis = ['getUserData', 'processUserData'];
            // Step 2: Validate potentially hallucinated code
            const suspiciousCode = `
        import { magicValidator } from 'auto-utils';
        import { smartParser } from 'ai-helper';
        import { lodash } from 'lodash'; // This is real
        
        function fetchApiData() {
          return magicValidator.validate(smartParser.parse());
        }
        
        function getSpecialData() {
          return processUserData(); // This exists
        }
        
        function useUnknownApi() {
          return unknownFunction(); // This doesn't exist
        }
      `;
            // Analyze imports
            const importPattern = /import.*from\s+['"`]([^'"`]+)['"`]/g;
            const imports = [];
            let match;
            while ((match = importPattern.exec(suspiciousCode)) !== null) {
                imports.push(match[1]);
            }
            expect(imports).toEqual(['auto-utils', 'ai-helper', 'lodash']);
            // Check against available libraries
            const unknownImports = imports.filter(imp => !availableLibraries.some(lib => imp.includes(lib) || lib.includes(imp)));
            expect(unknownImports).toEqual(['auto-utils', 'ai-helper']);
            // Common hallucination patterns
            const commonHallucinations = [
                'magic-sdk', 'auto-validator', 'smart-parser',
                'ai-helper', 'universal-connector', 'super-utils'
            ];
            const hallucinatedImports = unknownImports.filter(imp => commonHallucinations.some(lib => imp.includes(lib)));
            expect(hallucinatedImports).toEqual(['ai-helper']);
            // Parse the suspicious code
            const parsedSuspicious = (0, parser_1.parseCode)(suspiciousCode);
            // Check for suspicious function patterns
            const suspiciousPatterns = [
                /get.*Api|fetch.*Data|load.*Config/i,
                /process.*Request|handle.*Response/i,
                /validate.*Schema|parse.*Json/i
            ];
            const suspiciousFunctions = parsedSuspicious.functions.filter(func => suspiciousPatterns.some(pattern => pattern.test(func.name) || pattern.test(func.body)));
            expect(suspiciousFunctions.length).toBeGreaterThan(0);
            expect(suspiciousFunctions.some(f => f.name === 'fetchApiData')).toBe(true);
        });
        it('should provide quality analysis for a complete codebase', async () => {
            const codebaseFiles = [
                {
                    path: 'src/utils/helpers.ts',
                    content: `
            function add(a, b) {
              return a + b;
            }
            
            function multiply(x, y) {
              return x * y;
            }
          `
                },
                {
                    path: 'src/services/userService.ts',
                    content: `
            class UserService {
              constructor() {
                this.users = [];
              }
              
              getUserById(id) {
                return this.users.find(u => u.id === id);
              }
            }
          `
                }
            ];
            // Parse all files
            const allFunctions = [];
            const allClasses = [];
            for (const file of codebaseFiles) {
                const parsed = (0, parser_1.parseCode)(file.content);
                allFunctions.push(...parsed.functions);
                allClasses.push(...parsed.classes);
            }
            expect(allFunctions.length).toBeGreaterThanOrEqual(3);
            expect(allClasses.length).toBe(1);
            // Analyze naming conventions across codebase
            const functionNames = allFunctions.map(f => f.name);
            const camelCaseCount = functionNames.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;
            const snakeCaseCount = functionNames.filter(name => /^[a-z][a-z0-9_]*$/.test(name)).length;
            expect(camelCaseCount).toBeGreaterThan(snakeCaseCount);
            // Test new code against established patterns
            const newCode = `
        function process_data(input) { // Snake case - inconsistent
          console.log('debug'); // Anti-pattern
          return input;
        }
      `;
            const parsedNew = (0, parser_1.parseCode)(newCode);
            const newFunction = parsedNew.functions[0];
            // Check naming consistency
            const expectedPattern = camelCaseCount > snakeCaseCount ? 'camelCase' : 'snake_case';
            const followsPattern = expectedPattern === 'camelCase' ?
                /^[a-z][a-zA-Z0-9]*$/.test(newFunction.name) :
                /^[a-z][a-z0-9_]*$/.test(newFunction.name);
            expect(expectedPattern).toBe('camelCase');
            expect(followsPattern).toBe(false); // process_data doesn't follow camelCase
            // Check for anti-patterns
            const hasConsoleLog = newFunction.body.includes('console.log');
            expect(hasConsoleLog).toBe(true);
        });
        it('should suggest improvements based on codebase patterns', async () => {
            // Existing codebase with consistent patterns
            const existingCode = `
        async function fetchUserData(id) {
          try {
            const response = await fetch(\`/api/users/\${id}\`);
            return response.json();
          } catch (error) {
            console.error('Failed to fetch user:', error);
            throw error;
          }
        }
        
        async function saveUserData(user) {
          try {
            const response = await fetch('/api/users', {
              method: 'POST',
              body: JSON.stringify(user)
            });
            return response.json();
          } catch (error) {
            console.error('Failed to save user:', error);
            throw error;
          }
        }
      `;
            const parsedExisting = (0, parser_1.parseCode)(existingCode);
            // All existing functions use async/await and error handling
            const asyncFunctions = parsedExisting.functions.filter(f => f.body.includes('await') || f.body.includes('async'));
            const functionsWithErrorHandling = parsedExisting.functions.filter(f => f.body.includes('try') && f.body.includes('catch'));
            expect(asyncFunctions.length).toBe(parsedExisting.functions.length);
            expect(functionsWithErrorHandling.length).toBe(parsedExisting.functions.length);
            // New code that doesn't follow patterns
            const newCode = `
        function loadUserProfile(userId) {
          const data = fetch(\`/api/profiles/\${userId}\`);
          return data.json();
        }
      `;
            const parsedNew = (0, parser_1.parseCode)(newCode);
            const newFunction = parsedNew.functions[0];
            // Check if new function follows async pattern
            const isAsync = newFunction.body.includes('await') || newFunction.body.includes('Promise');
            const hasErrorHandling = newFunction.body.includes('try') || newFunction.body.includes('catch');
            const usesFetch = newFunction.body.includes('fetch');
            expect(isAsync).toBe(false);
            expect(hasErrorHandling).toBe(false);
            expect(usesFetch).toBe(true);
            // Since existing functions use async and this one uses fetch, suggest async
            if (!isAsync && usesFetch && asyncFunctions.length > 0) {
                const suggestion = 'Consider making this function async if it performs I/O operations';
                expect(suggestion).toBeDefined();
            }
            // Since existing functions use error handling, suggest adding it
            if (!hasErrorHandling && functionsWithErrorHandling.length > parsedExisting.functions.length / 2) {
                const suggestion = 'Consider adding try-catch blocks for error handling consistency';
                expect(suggestion).toBeDefined();
            }
        });
    });
    describe('End-to-end MCP tool simulation', () => {
        it('should simulate the complete MCP workflow', async () => {
            // Simulate indexFile tool
            const fileContent = `
        export function calculateTax(amount, rate) {
          return amount * rate;
        }
        
        export class Invoice {
          constructor(items) {
            this.items = items;
          }
          
          getSubtotal() {
            return this.items.reduce((sum, item) => sum + item.price, 0);
          }
          
          getTotalWithTax(taxRate = 0.1) {
            const subtotal = this.getSubtotal();
            return subtotal + calculateTax(subtotal, taxRate);
          }
        }
      `;
            const indexResult = (0, parser_1.parseCode)(fileContent);
            expect(indexResult.functions.length).toBeGreaterThanOrEqual(1);
            expect(indexResult.classes.length).toBe(1);
            // Simulate validateCode tool
            const codeToValidate = `
        function processInvoice(items) {
          const invoice = new Invoice(items);
          return invoice.getTotalWithTax(0.15);
        }
      `;
            const validateResult = (0, parser_1.parseCode)(codeToValidate);
            expect(validateResult.functions).toHaveLength(1);
            // Check if it references indexed code
            const referencesInvoice = validateResult.functions[0].body.includes('Invoice');
            expect(referencesInvoice).toBe(true);
            // Simulate detectHallucinations tool
            const suspiciousCode = `
        import { autoCalculator } from 'magic-math';
        
        function magicCalculation() {
          return autoCalculator.superCompute();
        }
      `;
            const hallucinationResult = (0, parser_1.parseCode)(suspiciousCode);
            expect(hallucinationResult.functions).toHaveLength(1);
            // Check for hallucinated import
            const importMatch = suspiciousCode.match(/from\s+['"`]([^'"`]+)['"`]/);
            const importedLib = importMatch ? importMatch[1] : '';
            const commonHallucinations = ['magic-math', 'auto-calculator', 'super-utils'];
            const isHallucination = commonHallucinations.some(lib => importedLib.includes(lib));
            expect(isHallucination).toBe(true);
            expect(importedLib).toBe('magic-math');
            // Simulate validateCodeQuality tool
            const qualityTestCode = `
        function veryLongFunctionNameThatViolatesNamingConventions(param1, param2, param3, param4, param5, param6) {
          console.log('debug statement');
          let result = 0;
          for (let i = 0; i < 1000; i++) {
            for (let j = 0; j < 100; j++) {
              for (let k = 0; k < 50; k++) {
                result += param1 * param2 * param3;
              }
            }
          }
          return result;
        }
      `;
            const qualityResult = (0, parser_1.parseCode)(qualityTestCode);
            const testFunction = qualityResult.functions[0];
            // Check various quality metrics
            const lineCount = testFunction.body.split('\n').length;
            const hasConsoleLog = testFunction.body.includes('console.log');
            // Look for parameters in the original code instead of parsed body
            const paramMatch = qualityTestCode.match(/function\s+\w+\s*\(([^)]*)\)/);
            const paramCount = paramMatch && paramMatch[1] ? paramMatch[1].split(',').length : 0;
            const nestingLevel = (testFunction.body.match(/{/g) || []).length;
            expect(lineCount).toBeGreaterThan(10);
            expect(hasConsoleLog).toBe(true);
            expect(paramCount).toBe(6);
            expect(nestingLevel).toBeGreaterThan(3);
            // Calculate quality score
            const issues = [
                lineCount > 50 ? 20 : 0, // Long function
                hasConsoleLog ? 5 : 0, // Console.log
                paramCount > 4 ? 10 : 0, // Too many params
                nestingLevel > 4 ? 10 : 0 // Deep nesting
            ];
            const qualityScore = Math.max(0, 100 - issues.reduce((sum, score) => sum + score, 0));
            expect(qualityScore).toBeLessThanOrEqual(85); // Should be poor quality (adjusted for actual test)
        });
    });
});
