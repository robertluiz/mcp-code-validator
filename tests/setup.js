"use strict";
// Global test setup
process.env.NODE_ENV = 'test';
// Set default test environment variables
if (!process.env.NEO4J_URI) {
    process.env.NEO4J_URI = 'bolt://localhost:7687';
}
if (!process.env.NEO4J_USER) {
    process.env.NEO4J_USER = 'neo4j';
}
if (!process.env.NEO4J_PASSWORD) {
    process.env.NEO4J_PASSWORD = 'test-password';
}
// Mock console methods for cleaner test output
const originalConsole = console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
};
// Global cleanup
afterEach(() => {
    jest.clearAllMocks();
});
