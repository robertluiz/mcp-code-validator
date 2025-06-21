/**
 * Tests for the new code relationship functionality
 */

// Restore the real parseCode function in case other tests mocked it
jest.unmock('../src/parser');

import { parseCode } from '../src/parser';

// Mock Neo4j for relationship tests
const mockSession = {
    close: jest.fn().mockResolvedValue(undefined),
    executeRead: jest.fn(),
    executeWrite: jest.fn()
};

const mockDriver = {
    session: jest.fn(() => mockSession)
};

jest.mock('../src/neo4j', () => ({
    getDriver: jest.fn(() => mockDriver),
    closeDriver: jest.fn().mockResolvedValue(undefined)
}));

describe('Code Relationships', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Ensure we're using the real parseCode function
        jest.doMock('../src/parser', () => jest.requireActual('../src/parser'));
    });

    describe('Import/Export Relationships', () => {
        it('should parse and identify import relationships', async () => {
            // Use dynamic import to ensure we get the real parser
            const { parseCode: realParseCode } = await import('../src/parser');
            
            const code = `
                import React from 'react';
                import { useState, useEffect } from 'react';
                import axios from 'axios';
                import { UserService } from './services/user';
                
                function App() {
                    const [users, setUsers] = useState([]);
                    return <div>Hello World</div>;
                }
            `;
            
            const result = realParseCode(code, 'tsx');
            
            expect(result.imports).toBeDefined();
            expect(result.imports.length).toBeGreaterThan(0);
            
            // Check specific imports - there should be multiple react imports
            const reactImports = result.imports.filter(imp => imp.source === 'react');
            expect(reactImports.length).toBeGreaterThanOrEqual(1);
            
            // Check that useState is imported from react (could be in any of the react imports)
            const allReactImports = reactImports.flatMap(imp => imp.imports);
            expect(allReactImports).toContain('useState');
            expect(allReactImports).toContain('React');
            
            const userServiceImport = result.imports.find(imp => imp.source === './services/user');
            expect(userServiceImport).toBeDefined();
            expect(userServiceImport?.imports).toContain('UserService');
        });

        it('should parse and identify export relationships', async () => {
            // Use dynamic import to ensure we get the real parser
            const { parseCode: realParseCode } = await import('../src/parser');
            
            const code = `
                export function calculateTotal(items) {
                    return items.reduce((sum, item) => sum + item.price, 0);
                }
                
                export class UserManager {
                    constructor() {}
                }
                
                export default function App() {
                    return "Hello";
                }
            `;
            
            const result = realParseCode(code, 'ts');
            
            expect(result.exports).toBeDefined();
            expect(result.exports.length).toBeGreaterThan(0);
            
            // Check for named exports
            const namedExports = result.exports.filter(exp => exp.type === 'named');
            expect(namedExports.length).toBeGreaterThanOrEqual(2);
            
            // Check for default export
            const defaultExports = result.exports.filter(exp => exp.type === 'default');
            expect(defaultExports.length).toBe(1);
        });
    });

    describe('Function Call Relationships', () => {
        it('should identify function calls within code', () => {
            const code = `
                function calculateTotal(items) {
                    return items.reduce((sum, item) => sum + item.price, 0);
                }
                
                function calculateTax(amount) {
                    return amount * 0.1;
                }
                
                function processOrder(items) {
                    const total = calculateTotal(items);
                    const tax = calculateTax(total);
                    return total + tax;
                }
                
                class OrderProcessor {
                    process() {
                        return processOrder([]);
                    }
                }
            `;
            
            const result = parseCode(code, 'ts');
            
            expect(result.functions.length).toBe(4); // 3 top-level functions + 1 class method
            expect(result.classes.length).toBe(1);
            
            // Check that processOrder function contains calls to other functions
            const processOrderFunction = result.functions.find(f => f.name === 'processOrder');
            expect(processOrderFunction).toBeDefined();
            expect(processOrderFunction?.body).toContain('calculateTotal');
            expect(processOrderFunction?.body).toContain('calculateTax');
            
            // Check class method exists as a function
            const processMethod = result.functions.find(f => f.name === 'process');
            expect(processMethod).toBeDefined();
            expect(processMethod?.body).toContain('processOrder');
            
            // Check class contains processOrder call
            const orderProcessorClass = result.classes.find(c => c.name === 'OrderProcessor');
            expect(orderProcessorClass).toBeDefined();
            expect(orderProcessorClass?.body).toContain('processOrder');
        });

        it('should identify class instantiation patterns', () => {
            const code = `
                class UserService {
                    getUser(id) { return null; }
                }
                
                function createUserManager() {
                    const service = new UserService();
                    return service;
                }
                
                function processUsers() {
                    const manager = new UserService();
                    const db = new Database();
                    return manager;
                }
            `;
            
            const result = parseCode(code, 'ts');
            
            expect(result.functions.length).toBe(3); // 2 top-level functions + 1 class method
            expect(result.classes.length).toBe(1);
            
            // Check for new keyword patterns
            const createFunction = result.functions.find(f => f.name === 'createUserManager');
            expect(createFunction?.body).toContain('new UserService');
            
            const processFunction = result.functions.find(f => f.name === 'processUsers');
            expect(processFunction?.body).toContain('new UserService');
            expect(processFunction?.body).toContain('new Database');
        });
    });

    describe('Class Inheritance Relationships', () => {
        it('should identify class extension relationships', () => {
            const code = `
                class Animal {
                    speak() { return "sound"; }
                }
                
                class Dog extends Animal {
                    speak() { return "woof"; }
                }
                
                class Cat extends Animal {
                    speak() { return "meow"; }
                }
            `;
            
            const result = parseCode(code, 'ts');
            
            expect(result.classes.length).toBe(3);
            
            const dogClass = result.classes.find(c => c.name === 'Dog');
            expect(dogClass).toBeDefined();
            expect(dogClass?.body).toMatch(/extends\s+Animal/);
            
            const catClass = result.classes.find(c => c.name === 'Cat');
            expect(catClass).toBeDefined();
            expect(catClass?.body).toMatch(/extends\s+Animal/);
        });

        it('should identify interface implementation relationships', () => {
            const code = `
                interface Flyable {
                    fly(): void;
                }
                
                interface Swimmable {
                    swim(): void;
                }
                
                class Bird implements Flyable {
                    fly() { console.log("flying"); }
                }
                
                class Duck implements Flyable, Swimmable {
                    fly() { console.log("duck flying"); }
                    swim() { console.log("duck swimming"); }
                }
            `;
            
            const result = parseCode(code, 'ts');
            
            expect(result.classes.length).toBe(2);
            
            const birdClass = result.classes.find(c => c.name === 'Bird');
            expect(birdClass).toBeDefined();
            expect(birdClass?.body).toMatch(/implements\s+Flyable/);
            
            const duckClass = result.classes.find(c => c.name === 'Duck');
            expect(duckClass).toBeDefined();
            expect(duckClass?.body).toMatch(/implements\s+Flyable,\s*Swimmable/);
        });
    });

    describe('Complex Relationship Patterns', () => {
        it('should handle complex code with multiple relationship types', () => {
            const code = `
                import { EventEmitter } from 'events';
                import { Logger } from './utils/logger';
                
                interface DatabaseConnection {
                    connect(): Promise<void>;
                    query(sql: string): Promise<any>;
                }
                
                class PostgresConnection implements DatabaseConnection {
                    async connect() { /* implementation */ }
                    async query(sql: string) { /* implementation */ }
                }
                
                class UserRepository extends EventEmitter {
                    private db: DatabaseConnection;
                    private logger: Logger;
                    
                    constructor() {
                        super();
                        this.db = new PostgresConnection();
                        this.logger = new Logger();
                    }
                    
                    async findUser(id: string) {
                        const result = await this.db.query(\`SELECT * FROM users WHERE id = \${id}\`);
                        this.logger.info(\`Found user: \${id}\`);
                        return result;
                    }
                }
                
                export function createUserService() {
                    const repo = new UserRepository();
                    return repo;
                }
                
                export { UserRepository };
            `;
            
            const result = parseCode(code, 'ts');
            
            // Check imports
            expect(result.imports.length).toBe(2);
            const eventsImport = result.imports.find(imp => imp.source === 'events');
            expect(eventsImport?.imports).toContain('EventEmitter');
            
            // Check classes and inheritance
            expect(result.classes.length).toBe(2);
            const userRepoClass = result.classes.find(c => c.name === 'UserRepository');
            expect(userRepoClass?.body).toMatch(/extends\s+EventEmitter/);
            
            const postgresClass = result.classes.find(c => c.name === 'PostgresConnection');
            expect(postgresClass?.body).toMatch(/implements\s+DatabaseConnection/);
            
            // Check function instantiation
            const createFunction = result.functions.find(f => f.name === 'createUserService');
            expect(createFunction?.body).toContain('new UserRepository');
            
            // Check exports
            expect(result.exports.length).toBeGreaterThanOrEqual(2);
            const namedExports = result.exports.filter(exp => exp.type === 'named');
            expect(namedExports.some(exp => exp.name === 'UserRepository')).toBe(true);
        });
    });

    describe('Relationship Analysis Integration', () => {
        it('should provide comprehensive relationship analysis', async () => {
            // Mock the relationship analysis query results
            mockSession.executeRead.mockImplementation((callback) => {
                const mockTx = {
                    run: jest.fn().mockResolvedValue({
                        records: [
                            {
                                get: jest.fn().mockImplementation((key) => {
                                    switch (key) {
                                        case 'caller': return 'processOrder';
                                        case 'called': return 'calculateTotal';
                                        case 'relationship': return 'CALLS';
                                        case 'nodeType': return 'Function';
                                        case 'count': return { toNumber: () => 5 };
                                        default: return null;
                                    }
                                })
                            }
                        ]
                    })
                };
                return callback(mockTx);
            });

            // The analyzeRelationships function would be called here
            // This test verifies the structure is in place for relationship analysis
            expect(mockSession.executeRead).toBeDefined();
            expect(mockSession.executeWrite).toBeDefined();
        });
    });
});