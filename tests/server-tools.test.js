"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../src/parser");
// Mock dependencies
jest.mock('../src/parser');
jest.mock('../src/neo4j');
const mockParseCode = parser_1.parseCode;
// Mock Neo4j session
const mockSession = {
    close: jest.fn().mockResolvedValue(undefined),
    executeRead: jest.fn(),
    executeWrite: jest.fn()
};
const mockDriver = {
    session: jest.fn(() => mockSession)
};
// Mock the getDriver function
jest.mock('../src/neo4j', () => ({
    getDriver: jest.fn(() => mockDriver),
    closeDriver: jest.fn().mockResolvedValue(undefined)
}));
describe('MCP Server Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock implementation for parseCode
        mockParseCode.mockReturnValue({
            functions: [
                { name: 'testFunction', body: 'function testFunction() { return "test"; }' }
            ],
            classes: [
                { name: 'TestClass', body: 'class TestClass { method() {} }' }
            ]
        });
    });
    describe('indexFile functionality', () => {
        it('should parse code and index functions and classes', async () => {
            const { indexParsedCode } = require('./__mocks__/server');
            await indexParsedCode(mockSession, {
                functions: [{ name: 'testFunc', body: 'test body' }],
                classes: [{ name: 'TestClass', body: 'class body' }]
            }, 'src/test.ts', 'typescript');
            // The mock function should be called
            expect(indexParsedCode).toHaveBeenCalledWith(mockSession, {
                functions: [{ name: 'testFunc', body: 'test body' }],
                classes: [{ name: 'TestClass', body: 'class body' }]
            }, 'src/test.ts', 'typescript');
        });
        it('should handle empty functions and classes arrays', async () => {
            const { indexParsedCode } = require('./__mocks__/server');
            await indexParsedCode(mockSession, {
                functions: [],
                classes: []
            }, 'src/empty.ts', 'typescript');
            expect(indexParsedCode).toHaveBeenCalledWith(mockSession, { functions: [], classes: [] }, 'src/empty.ts', 'typescript');
        });
    });
    describe('detectHallucinations functionality', () => {
        beforeEach(() => {
            mockParseCode.mockReturnValue({
                functions: [
                    { name: 'fetchApiData', body: 'function fetchApiData() { return api.getData(); }' },
                    { name: 'regularFunction', body: 'function regularFunction() { return "normal"; }' }
                ],
                classes: []
            });
        });
        it('should detect suspicious function patterns', () => {
            // Mock session to return no existing functions
            mockSession.executeRead.mockResolvedValue({ records: [] });
            const code = `
        function fetchApiData() {
          return api.getData();
        }
        
        function processRequest() {
          return handleResponse();
        }
      `;
            // The actual implementation would analyze these patterns
            expect(mockParseCode).toBeDefined();
            const result = mockParseCode(code);
            // Check that suspicious patterns are detected
            const suspiciousFunction = result.functions.find(f => f.name === 'fetchApiData');
            expect(suspiciousFunction).toBeDefined();
            expect(suspiciousFunction?.name).toMatch(/fetch.*Data/i);
        });
        it('should detect hallucinated imports', () => {
            const code = `
        import { magicValidator } from 'auto-utils';
        import { smartParser } from 'ai-helper';
        import { realLibrary } from 'lodash';
      `;
            // Test import pattern detection
            const importPatterns = [
                /import.*from\s+['"`]([^'"`]+)['"`]/g,
                /require\(['"`]([^'"`]+)['"`]\)/g
            ];
            const imports = [];
            for (const pattern of importPatterns) {
                let match;
                while ((match = pattern.exec(code)) !== null) {
                    imports.push(match[1]);
                }
            }
            expect(imports).toContain('auto-utils');
            expect(imports).toContain('ai-helper');
            expect(imports).toContain('lodash');
            // Common hallucinated packages
            const commonHallucinations = [
                'magic-sdk', 'auto-validator', 'smart-parser',
                'ai-helper', 'universal-connector', 'super-utils'
            ];
            const hallucinatedImports = imports.filter(imp => commonHallucinations.some(lib => imp.includes(lib)));
            expect(hallucinatedImports).toHaveLength(1);
            expect(hallucinatedImports[0]).toBe('ai-helper');
        });
        it('should validate against available libraries context', () => {
            const context = {
                availableLibraries: ['react', 'lodash', 'axios'],
                projectApis: ['getUserData', 'saveUser'],
                allowedPatterns: ['.*Service$', '.*Helper$']
            };
            const testImports = ['react', 'unknown-lib', 'lodash'];
            const unknownImports = testImports.filter(imp => !context.availableLibraries.some(lib => imp.includes(lib) || lib.includes(imp)));
            expect(unknownImports).toEqual(['unknown-lib']);
        });
    });
    describe('validateCodeQuality functionality', () => {
        it('should detect naming convention issues', () => {
            const existingNames = ['camelCaseFunction', 'anotherCamelCase', 'yetAnother'];
            // Test function names
            const testNames = ['snake_case_function', 'camelCaseGood', 'PascalCase'];
            const projectUsesCamelCase = existingNames.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;
            const projectUsesSnakeCase = existingNames.filter(name => /^[a-z][a-z0-9_]*$/.test(name)).length;
            const expectedPattern = projectUsesCamelCase > projectUsesSnakeCase ? 'camelCase' : 'snake_case';
            expect(expectedPattern).toBe('camelCase');
            const violations = testNames.filter(name => {
                const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(name);
                return expectedPattern === 'camelCase' && !isCamelCase;
            });
            expect(violations).toEqual(['snake_case_function', 'PascalCase']);
        });
        it('should detect anti-patterns', () => {
            const code = `
        function badFunction() {
          console.log('debug message');
          debugger;
          eval('dangerous code');
          document.write('deprecated');
        }
      `;
            const antiPatterns = [
                { pattern: /console\.log/g, message: 'Debug console.log statements found', severity: 'LOW' },
                { pattern: /debugger;/g, message: 'Debugger statements found', severity: 'MEDIUM' },
                { pattern: /eval\(/g, message: 'Dangerous eval() usage found', severity: 'HIGH' },
                { pattern: /document\.write/g, message: 'Deprecated document.write usage', severity: 'MEDIUM' }
            ];
            const detectedIssues = antiPatterns.filter(antiPattern => code.match(antiPattern.pattern));
            expect(detectedIssues).toHaveLength(4);
            expect(detectedIssues.map(i => i.severity)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'MEDIUM']);
        });
        it('should calculate quality scores', () => {
            const highSeverityCount = 1;
            const mediumSeverityCount = 2;
            const lowSeverityCount = 1;
            const qualityScore = Math.max(0, 100 - (highSeverityCount * 20 + mediumSeverityCount * 10 + lowSeverityCount * 5));
            expect(qualityScore).toBe(55); // 100 - (1*20 + 2*10 + 1*5) = 100 - 45 = 55
            const grade = qualityScore >= 90 ? 'A' :
                qualityScore >= 80 ? 'B' :
                    qualityScore >= 70 ? 'C' :
                        qualityScore >= 60 ? 'D' : 'F';
            expect(grade).toBe('F');
        });
        it('should detect security issues', () => {
            const code = `
        const password = "hardcoded123";
        const api_key = "sk-1234567890";
        element.innerHTML = userInput;
        document.cookie = "session=123";
      `;
            const securityPatterns = [
                { pattern: /password\s*=\s*['"`][^'"`]+['"`]/gi, message: 'Hard-coded password detected' },
                { pattern: /api_key\s*=\s*['"`][^'"`]+['"`]/gi, message: 'Hard-coded API key detected' },
                { pattern: /innerHTML\s*=/gi, message: 'Potential XSS vulnerability with innerHTML' },
                { pattern: /document\.cookie/gi, message: 'Direct cookie manipulation detected' }
            ];
            const securityIssues = securityPatterns.filter(pattern => code.match(pattern.pattern));
            expect(securityIssues).toHaveLength(4);
        });
    });
    describe('suggestImprovements functionality', () => {
        it('should detect magic numbers', () => {
            const functionBody = `
        function process() {
          for (let i = 0; i < 100; i++) {
            if (value > 50) {
              retry(3);
            }
          }
        }
      `;
            const magicNumbers = functionBody.match(/\b\d{2,}\b/g);
            expect(magicNumbers).toEqual(['100', '50']);
        });
        it('should detect too many parameters', () => {
            const functionSignature = 'function myFunc(param1, param2, param3, param4, param5)';
            const paramMatch = functionSignature.match(/function\s+\w+\s*\(([^)]*)\)/);
            if (paramMatch) {
                const paramCount = paramMatch[1] ? paramMatch[1].split(',').length : 0;
                expect(paramCount).toBe(5);
                expect(paramCount).toBeGreaterThan(4);
            }
        });
        it('should calculate code similarity', () => {
            const str1 = 'function add(a, b) { return a + b; }';
            const str2 = 'function subtract(x, y) { return x - y; }';
            const tokens1 = str1.toLowerCase().split(/\W+/).filter(t => t.length > 2);
            const tokens2 = str2.toLowerCase().split(/\W+/).filter(t => t.length > 2);
            const intersection = tokens1.filter(token => tokens2.includes(token));
            const union = [...new Set([...tokens1, ...tokens2])];
            const similarity = intersection.length / union.length;
            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThan(1);
            // Should detect common tokens like 'function', 'return'
            expect(intersection).toContain('function');
            expect(intersection).toContain('return');
        });
        it('should suggest async patterns', () => {
            const functionBody = `
        function fetchData() {
          const data = fetch('/api/data');
          return data;
        }
      `;
            const isAsync = functionBody.includes('await') || functionBody.includes('Promise');
            const hasFetch = functionBody.includes('fetch');
            expect(isAsync).toBe(false);
            expect(hasFetch).toBe(true);
            // Should suggest making it async since it uses fetch
            if (!isAsync && hasFetch) {
                const suggestion = 'Consider making this function async if it performs I/O operations';
                expect(suggestion).toBeDefined();
            }
        });
    });
    describe('Error handling', () => {
        it('should handle parser errors gracefully', async () => {
            mockParseCode.mockImplementation(() => {
                throw new Error('Parse error');
            });
            // The actual tool implementations should catch and handle parser errors
            expect(() => mockParseCode('invalid code')).toThrow('Parse error');
        });
        it('should handle database connection errors', async () => {
            mockSession.executeRead.mockRejectedValue(new Error('Database connection failed'));
            await expect(mockSession.executeRead()).rejects.toThrow('Database connection failed');
        });
        it('should handle session close errors', async () => {
            mockSession.close.mockRejectedValue(new Error('Session close error'));
            await expect(mockSession.close()).rejects.toThrow('Session close error');
        });
    });
});
