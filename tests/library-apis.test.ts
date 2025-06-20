import { 
    getLibraryAPI, 
    isKnownLibraryMember, 
    getAllLibraryMembers, 
    parsePackageJsonDependencies,
    KNOWN_LIBRARY_APIS 
} from '../src/library-apis';

describe('Library APIs', () => {
    describe('getLibraryAPI', () => {
        it('should return React API definition', () => {
            const reactAPI = getLibraryAPI('react');
            
            expect(reactAPI).toBeDefined();
            expect(reactAPI?.name).toBe('react');
            expect(reactAPI?.functions).toContain('createElement');
            expect(reactAPI?.hooks).toContain('useState');
            expect(reactAPI?.hooks).toContain('useEffect');
        });

        it('should return Next.js API definition', () => {
            const nextAPI = getLibraryAPI('next');
            
            expect(nextAPI).toBeDefined();
            expect(nextAPI?.name).toBe('next');
            expect(nextAPI?.functions).toContain('getServerSideProps');
            expect(nextAPI?.types).toContain('NextPage');
        });

        it('should return null for unknown library', () => {
            const unknownAPI = getLibraryAPI('unknown-library');
            expect(unknownAPI).toBeNull();
        });

        it('should handle scoped packages', () => {
            const emotionAPI = getLibraryAPI('@emotion/react');
            expect(emotionAPI).toBeDefined();
            expect(emotionAPI?.name).toBe('@emotion/react');
        });
    });

    describe('isKnownLibraryMember', () => {
        it('should validate React hooks correctly', () => {
            expect(isKnownLibraryMember('react', 'useState', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useEffect', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useFakeHook', 'hook')).toBe(false);
        });

        it('should validate React functions correctly', () => {
            expect(isKnownLibraryMember('react', 'createElement', 'function')).toBe(true);
            expect(isKnownLibraryMember('react', 'createContext', 'function')).toBe(true);
            expect(isKnownLibraryMember('react', 'fakeFunction', 'function')).toBe(false);
        });

        it('should validate lodash functions correctly', () => {
            expect(isKnownLibraryMember('lodash', 'map', 'function')).toBe(true);
            expect(isKnownLibraryMember('lodash', 'filter', 'function')).toBe(true);
            expect(isKnownLibraryMember('lodash', 'debounce', 'function')).toBe(true);
            expect(isKnownLibraryMember('lodash', 'fakeFunction', 'function')).toBe(false);
        });

        it('should validate axios functions correctly', () => {
            expect(isKnownLibraryMember('axios', 'get', 'function')).toBe(true);
            expect(isKnownLibraryMember('axios', 'post', 'function')).toBe(true);
            expect(isKnownLibraryMember('axios', 'fakeMethod', 'function')).toBe(false);
        });

        it('should return false for unknown library', () => {
            expect(isKnownLibraryMember('unknown-lib', 'anyFunction', 'function')).toBe(false);
        });
    });

    describe('getAllLibraryMembers', () => {
        it('should return all React members', () => {
            const reactMembers = getAllLibraryMembers('react');
            
            expect(reactMembers).toContain('useState');
            expect(reactMembers).toContain('useEffect');
            expect(reactMembers).toContain('createElement');
            expect(reactMembers).toContain('Component');
            expect(reactMembers).toContain('FC');
            expect(reactMembers.length).toBeGreaterThan(10);
        });

        it('should return empty array for unknown library', () => {
            const unknownMembers = getAllLibraryMembers('unknown-library');
            expect(unknownMembers).toEqual([]);
        });
    });

    describe('parsePackageJsonDependencies', () => {
        it('should parse dependencies correctly', () => {
            const packageJson = `{
                "dependencies": {
                    "react": "^18.0.0",
                    "next": "^13.0.0"
                },
                "devDependencies": {
                    "typescript": "^5.0.0",
                    "@types/node": "^20.0.0"
                }
            }`;

            const dependencies = parsePackageJsonDependencies(packageJson);
            
            expect(dependencies).toContain('react');
            expect(dependencies).toContain('next');
            expect(dependencies).toContain('typescript');
            expect(dependencies).toContain('@types/node');
            expect(dependencies).toHaveLength(4);
        });

        it('should handle empty dependencies', () => {
            const packageJson = `{
                "name": "test-project",
                "version": "1.0.0"
            }`;

            const dependencies = parsePackageJsonDependencies(packageJson);
            expect(dependencies).toEqual([]);
        });

        it('should handle malformed JSON gracefully', () => {
            const malformedJson = `{ invalid json }`;
            
            const dependencies = parsePackageJsonDependencies(malformedJson);
            expect(dependencies).toEqual([]);
        });

        it('should include peerDependencies', () => {
            const packageJson = `{
                "dependencies": {
                    "react": "^18.0.0"
                },
                "peerDependencies": {
                    "react-dom": "^18.0.0"
                }
            }`;

            const dependencies = parsePackageJsonDependencies(packageJson);
            
            expect(dependencies).toContain('react');
            expect(dependencies).toContain('react-dom');
        });
    });

    describe('Known Library Coverage', () => {
        it('should have React library defined', () => {
            expect(KNOWN_LIBRARY_APIS['react']).toBeDefined();
            expect(KNOWN_LIBRARY_APIS['react'].hooks).toBeDefined();
        });

        it('should have essential frontend libraries', () => {
            const essentialLibs = ['react', 'next', '@emotion/react', 'styled-components'];
            
            essentialLibs.forEach(lib => {
                expect(KNOWN_LIBRARY_APIS[lib]).toBeDefined();
            });
        });

        it('should have essential utility libraries', () => {
            const utilityLibs = ['lodash', 'axios', 'moment', 'uuid'];
            
            utilityLibs.forEach(lib => {
                expect(KNOWN_LIBRARY_APIS[lib]).toBeDefined();
            });
        });

        it('should have Node.js built-in modules', () => {
            const nodeModules = ['fs', 'path', 'crypto'];
            
            nodeModules.forEach(module => {
                expect(KNOWN_LIBRARY_APIS[module]).toBeDefined();
            });
        });
    });

    describe('Validation Edge Cases', () => {
        it('should handle case-sensitive library names', () => {
            expect(isKnownLibraryMember('React', 'useState', 'hook')).toBe(false);
            expect(isKnownLibraryMember('react', 'useState', 'hook')).toBe(true);
        });

        it('should validate member types correctly', () => {
            // useState is a hook, not a function
            expect(isKnownLibraryMember('react', 'useState', 'function')).toBe(false);
            expect(isKnownLibraryMember('react', 'useState', 'hook')).toBe(true);
            
            // Component is a class, not a function
            expect(isKnownLibraryMember('react', 'Component', 'function')).toBe(false);
            expect(isKnownLibraryMember('react', 'Component', 'class')).toBe(true);
        });

        it('should handle empty or undefined member names', () => {
            expect(isKnownLibraryMember('react', '', 'function')).toBe(false);
            expect(isKnownLibraryMember('react', undefined as any, 'function')).toBe(false);
        });
    });

    describe('Real-world Library Examples', () => {
        it('should validate common React patterns', () => {
            // Common React hooks
            expect(isKnownLibraryMember('react', 'useState', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useEffect', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useContext', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useCallback', 'hook')).toBe(true);
            expect(isKnownLibraryMember('react', 'useMemo', 'hook')).toBe(true);
        });

        it('should validate Next.js patterns', () => {
            expect(isKnownLibraryMember('next', 'getServerSideProps', 'function')).toBe(true);
            expect(isKnownLibraryMember('next', 'getStaticProps', 'function')).toBe(true);
            expect(isKnownLibraryMember('next', 'generateMetadata', 'function')).toBe(true);
        });

        it('should validate Express.js patterns', () => {
            expect(isKnownLibraryMember('express', 'Router', 'function')).toBe(true);
            expect(isKnownLibraryMember('express', 'static', 'function')).toBe(true);
            expect(isKnownLibraryMember('express', 'json', 'function')).toBe(true);
        });

        it('should detect hallucinated libraries', () => {
            const hallucinatedLibs = [
                'magic-sdk', 'auto-validator', 'smart-parser', 
                'ai-helper', 'universal-connector'
            ];
            
            hallucinatedLibs.forEach(lib => {
                expect(getLibraryAPI(lib)).toBeNull();
            });
        });
    });
});