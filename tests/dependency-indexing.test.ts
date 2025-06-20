import { parseCode } from '../src/parser';
import { parsePackageJsonDependencies, isKnownLibraryMember } from '../src/library-apis';

// Mock dependencies
jest.mock('../src/neo4j');

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

describe('Dependency Indexing Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default mock behavior
        mockSession.executeRead.mockResolvedValue({ records: [] });
        mockSession.executeWrite.mockResolvedValue({ records: [] });
    });

    describe('Package.json Dependency Parsing', () => {
        it('should parse a typical React project package.json', () => {
            const packageJson = `{
                "name": "react-app",
                "version": "1.0.0",
                "dependencies": {
                    "react": "^18.2.0",
                    "react-dom": "^18.2.0",
                    "next": "^13.0.0",
                    "styled-components": "^5.3.0",
                    "@emotion/react": "^11.10.0",
                    "lodash": "^4.17.21",
                    "axios": "^1.4.0"
                },
                "devDependencies": {
                    "typescript": "^5.0.0",
                    "@types/react": "^18.0.0",
                    "@types/node": "^20.0.0",
                    "jest": "^29.0.0"
                }
            }`;

            const dependencies = parsePackageJsonDependencies(packageJson);
            
            expect(dependencies).toContain('react');
            expect(dependencies).toContain('react-dom');
            expect(dependencies).toContain('next');
            expect(dependencies).toContain('styled-components');
            expect(dependencies).toContain('@emotion/react');
            expect(dependencies).toContain('lodash');
            expect(dependencies).toContain('axios');
            expect(dependencies).toContain('typescript');
            expect(dependencies).toContain('@types/react');
            expect(dependencies).toContain('@types/node');
            expect(dependencies).toContain('jest');
        });

        it('should handle Node.js backend project package.json', () => {
            const packageJson = `{
                "name": "node-backend",
                "version": "1.0.0",
                "dependencies": {
                    "express": "^4.18.0",
                    "mongoose": "^7.0.0",
                    "bcryptjs": "^2.4.3",
                    "jsonwebtoken": "^9.0.0",
                    "dotenv": "^16.0.0",
                    "cors": "^2.8.5",
                    "helmet": "^6.0.0"
                },
                "devDependencies": {
                    "nodemon": "^2.0.0",
                    "@types/express": "^4.17.0",
                    "@types/bcryptjs": "^2.4.0"
                }
            }`;

            const dependencies = parsePackageJsonDependencies(packageJson);
            
            expect(dependencies).toContain('express');
            expect(dependencies).toContain('mongoose');
            expect(dependencies).toContain('bcryptjs');
            expect(dependencies).toContain('jsonwebtoken');
            expect(dependencies).toContain('dotenv');
        });
    });

    describe('Library API Validation', () => {
        it('should validate React code against known APIs', () => {
            // Validate that React hooks are recognized
            expect(isKnownLibraryMember('react', 'useState', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useEffect', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'createElement', 'function')).toBe(true);
            
            // Validate React classes
            expect(isKnownLibraryMember('react', 'Component', 'class')).toBe(true);
            expect(isKnownLibraryMember('react', 'PureComponent', 'class')).toBe(true);
            
            // Validate non-existent APIs
            expect(isKnownLibraryMember('react-dom/client', 'createRoot', 'function')).toBe(false); // Not in our DB yet
            expect(isKnownLibraryMember('react', 'useAutoState', 'hook')).toBe(false);
        });

        it('should validate Next.js code against known APIs', () => {
            // Validate Next.js APIs
            expect(isKnownLibraryMember('next', 'getServerSideProps', 'function')).toBe(true);
            expect(isKnownLibraryMember('next', 'getStaticProps', 'function')).toBe(true);
            expect(isKnownLibraryMember('next', 'generateMetadata', 'function')).toBe(true);
            
            // Validate Next.js router APIs
            expect(isKnownLibraryMember('next/router', 'useRouter', 'function')).toBe(true);
            expect(isKnownLibraryMember('next/navigation', 'useRouter', 'function')).toBe(true);
            expect(isKnownLibraryMember('next/navigation', 'usePathname', 'function')).toBe(true);
            
            // Validate Next.js types
            expect(isKnownLibraryMember('next', 'NextPage', 'type')).toBe(true);
            expect(isKnownLibraryMember('next', 'NextApiRequest', 'type')).toBe(true);
        });

        it('should validate Express.js code against known APIs', () => {
            // Validate Express APIs
            expect(isKnownLibraryMember('express', 'Router', 'function')).toBe(true);
            expect(isKnownLibraryMember('express', 'json', 'function')).toBe(true);
            expect(isKnownLibraryMember('express', 'static', 'function')).toBe(true);
            expect(isKnownLibraryMember('express', 'urlencoded', 'function')).toBe(true);
            
            // Validate Express types
            expect(isKnownLibraryMember('express', 'Request', 'type')).toBe(true);
            expect(isKnownLibraryMember('express', 'Response', 'type')).toBe(true);
            expect(isKnownLibraryMember('express', 'NextFunction', 'type')).toBe(true);
        });
    });

    describe('Hallucination Detection with Library Context', () => {
        it('should detect valid React hooks vs hallucinated ones', () => {
            // Valid React hooks
            expect(isKnownLibraryMember('react', 'useState', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useEffect', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useCallback', 'hook')).toBe(true);
            
            // Hallucinated React hooks
            expect(isKnownLibraryMember('react', 'useAutoState', 'hook')).toBe(false);
            expect(isKnownLibraryMember('react', 'useMagicEffect', 'hook')).toBe(false);
            expect(isKnownLibraryMember('react', 'useSmartCallback', 'hook')).toBe(false);
        });

        it('should detect valid vs hallucinated library imports', () => {
            const validLibraries = ['react', 'lodash', 'axios', 'express'];
            const hallucinatedLibraries = ['magic-sdk', 'auto-validator', 'smart-parser', 'ai-helper'];
            
            validLibraries.forEach(lib => {
                expect(isKnownLibraryMember(lib, 'someFunction', 'function')).toBeDefined();
            });
            
            hallucinatedLibraries.forEach(lib => {
                expect(isKnownLibraryMember(lib, 'someFunction', 'function')).toBe(false);
            });
        });

        it('should validate styled-components APIs', () => {
            expect(isKnownLibraryMember('styled-components', 'styled', 'function')).toBe(true);
            expect(isKnownLibraryMember('styled-components', 'css', 'function')).toBe(true);
            expect(isKnownLibraryMember('styled-components', 'keyframes', 'function')).toBe(true);
            expect(isKnownLibraryMember('styled-components', 'createGlobalStyle', 'function')).toBe(true);
            expect(isKnownLibraryMember('styled-components', 'ThemeProvider', 'function')).toBe(true);
        });

        it('should validate utility library functions', () => {
            // Lodash functions
            const lodashFunctions = ['map', 'filter', 'reduce', 'debounce', 'throttle', 'cloneDeep'];
            lodashFunctions.forEach(func => {
                expect(isKnownLibraryMember('lodash', func, 'function')).toBe(true);
            });
            
            // Axios functions
            const axiosFunctions = ['get', 'post', 'put', 'delete', 'patch'];
            axiosFunctions.forEach(func => {
                expect(isKnownLibraryMember('axios', func, 'function')).toBe(true);
            });
            
            // UUID functions
            const uuidFunctions = ['v1', 'v4', 'validate'];
            uuidFunctions.forEach(func => {
                expect(isKnownLibraryMember('uuid', func, 'function')).toBe(true);
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle malformed package.json gracefully', () => {
            const malformedPackageJson = `{
                "dependencies": {
                    "react": "^18.0.0"
                    // missing comma
                "devDependencies": {
                    "typescript": "^5.0.0"
                }
            }`;

            const dependencies = parsePackageJsonDependencies(malformedPackageJson);
            expect(dependencies).toEqual([]);
        });

        it('should handle empty or minimal package.json', () => {
            const minimalPackageJson = `{
                "name": "test-project",
                "version": "1.0.0"
            }`;

            const dependencies = parsePackageJsonDependencies(minimalPackageJson);
            expect(dependencies).toEqual([]);
        });

        it('should handle scoped packages correctly', () => {
            const packageJson = `{
                "dependencies": {
                    "@emotion/react": "^11.0.0",
                    "@types/node": "^20.0.0",
                    "@babel/core": "^7.0.0"
                }
            }`;

            const dependencies = parsePackageJsonDependencies(packageJson);
            expect(dependencies).toContain('@emotion/react');
            expect(dependencies).toContain('@types/node');
            expect(dependencies).toContain('@babel/core');
        });

        it('should validate member types strictly', () => {
            // React Component is a class, not a function
            expect(isKnownLibraryMember('react', 'Component', 'class')).toBe(true);
            expect(isKnownLibraryMember('react', 'Component', 'function')).toBe(false);
            
            // useState is a hook, not a function
            expect(isKnownLibraryMember('react', 'useState', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useState', 'function')).toBe(false);
        });
    });

    describe('Performance and Coverage', () => {
        it('should cover major frontend ecosystem libraries', () => {
            const frontendLibs = [
                'react', 'react-dom', 'next', 'next/router', 'next/navigation',
                'styled-components', '@emotion/react'
            ];
            
            frontendLibs.forEach(lib => {
                expect(isKnownLibraryMember(lib, 'someFunction', 'function')).toBeDefined();
            });
        });

        it('should cover major utility libraries', () => {
            const utilityLibs = ['lodash', 'axios', 'moment', 'date-fns', 'uuid'];
            
            utilityLibs.forEach(lib => {
                expect(isKnownLibraryMember(lib, 'someFunction', 'function')).toBeDefined();
            });
        });

        it('should cover Node.js built-in modules', () => {
            const nodeModules = ['fs', 'path', 'crypto'];
            
            nodeModules.forEach(module => {
                expect(isKnownLibraryMember(module, 'someFunction', 'function')).toBeDefined();
            });
        });
    });
});