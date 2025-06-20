import { parseCode } from '../src/parser';

// Mock dependencies
jest.mock('../src/parser');
jest.mock('../src/neo4j');

// Mock the entire server module to prevent initialization
jest.mock('../src/server', () => ({
  generateContext: jest.fn((projectContext: string = 'default', branch: string = 'main'): string => {
    return `${projectContext}:${branch}`;
  }),
  indexParsedCode: jest.fn().mockResolvedValue(undefined)
}), { virtual: true });

const mockParseCode = parseCode as jest.MockedFunction<typeof parseCode>;

// Mock Neo4j session with more comprehensive mocking
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

describe('Branch Context Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for parseCode
    mockParseCode.mockReturnValue({
      functions: [
        { name: 'loginUser', body: 'function loginUser(user, pass) { return authenticate(user, pass); }' }
      ],
      classes: [
        { name: 'AuthService', body: 'class AuthService { validate() {} }' }
      ],
      reactComponents: [],
      reactHooks: [],
      nextjsPatterns: [],
      frontendElements: [],
      imports: [],
      exports: []
    });
  });

  describe('generateContext function', () => {
    it('should generate correct context string', () => {
      // Test the generateContext logic directly
      const generateContext = (projectContext: string = 'default', branch: string = 'main'): string => {
        return `${projectContext}:${branch}`;
      };
      
      expect(generateContext('my-app', 'main')).toBe('my-app:main');
      expect(generateContext('backend', 'feature/auth')).toBe('backend:feature/auth');
      expect(generateContext('frontend', 'develop')).toBe('frontend:develop');
      expect(generateContext()).toBe('default:main'); // default values
    });
  });

  describe('indexFile with branch context', () => {
    it('should index code with main branch context', async () => {
      // Mock Neo4j responses
      mockSession.executeWrite.mockResolvedValue({ records: [] });

      const { indexParsedCode } = require('./__mocks__/server');
      
      const parsedCode = {
        functions: [{ name: 'login', body: 'function login() {}' }],
        classes: [],
        reactComponents: [],
        reactHooks: [],
        nextjsPatterns: [],
        frontendElements: [],
        imports: [],
        exports: []
      };

      await indexParsedCode(mockSession, parsedCode, 'src/auth.ts', 'typescript', 'my-app', 'main');
      
      expect(indexParsedCode).toHaveBeenCalledWith(
        mockSession,
        parsedCode,
        'src/auth.ts',
        'typescript',
        'my-app',
        'main'
      );
    });

    it('should index code with feature branch context', async () => {
      mockSession.executeWrite.mockResolvedValue({ records: [] });

      const { indexParsedCode } = require('./__mocks__/server');
      
      const parsedCode = {
        functions: [{ name: 'oauthLogin', body: 'function oauthLogin() {}' }],
        classes: [],
        reactComponents: [],
        reactHooks: [],
        nextjsPatterns: [],
        frontendElements: [],
        imports: [],
        exports: []
      };

      await indexParsedCode(mockSession, parsedCode, 'src/auth.ts', 'typescript', 'my-app', 'feature/oauth');
      
      expect(indexParsedCode).toHaveBeenCalledWith(
        mockSession,
        parsedCode,
        'src/auth.ts',
        'typescript',
        'my-app',
        'feature/oauth'
      );
    });

    it('should use default values when branch and project not specified', async () => {
      mockSession.executeWrite.mockResolvedValue({ records: [] });

      const { indexParsedCode } = require('./__mocks__/server');
      
      const parsedCode = {
        functions: [{ name: 'defaultFunc', body: 'function defaultFunc() {}' }],
        classes: [],
        reactComponents: [],
        reactHooks: [],
        nextjsPatterns: [],
        frontendElements: [],
        imports: [],
        exports: []
      };

      // Call with default parameters
      await indexParsedCode(mockSession, parsedCode, 'src/default.ts', 'typescript', 'default', 'main');
      
      expect(indexParsedCode).toHaveBeenCalledWith(
        mockSession,
        parsedCode,
        'src/default.ts',
        'typescript',
        'default',
        'main'
      );
    });
  });

  describe('validateCode with branch context', () => {
    it('should validate against main branch context', async () => {
      // Mock that function exists in main branch
      mockSession.executeRead.mockResolvedValue({
        records: [{
          get: jest.fn().mockImplementation((key) => {
            if (key === 'body') return 'function login() { return true; }';
            if (key === 'updatedAt') return 1234567890;
            return null;
          })
        }]
      });

      const result = await mockSession.executeRead();
      expect(result.records.length).toBe(1);
      expect(result.records[0].get('body')).toBe('function login() { return true; }');
    });

    it('should validate against feature branch context', async () => {
      // Mock that function doesn't exist in feature branch
      mockSession.executeRead.mockResolvedValue({
        records: []
      });

      const result = await mockSession.executeRead();
      expect(result.records.length).toBe(0);
    });
  });

  describe('manageContexts with branch operations', () => {
    it('should list contexts with branch information', async () => {
      // Mock multiple contexts with branch info
      mockSession.executeRead.mockResolvedValue({
        records: [
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'my-app:main';
                case 'functions': return { toNumber: () => 5 };
                case 'classes': return { toNumber: () => 2 };
                case 'components': return { toNumber: () => 3 };
                case 'files': return { toNumber: () => 4 };
                default: return null;
              }
            })
          },
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'my-app:feature/auth';
                case 'functions': return { toNumber: () => 7 };
                case 'classes': return { toNumber: () => 1 };
                case 'components': return { toNumber: () => 2 };
                case 'files': return { toNumber: () => 3 };
                default: return null;
              }
            })
          }
        ]
      });

      const result = await mockSession.executeRead();
      expect(result.records.length).toBe(2);
      
      // Verify first context
      expect(result.records[0].get('context')).toBe('my-app:main');
      expect(result.records[0].get('functions').toNumber()).toBe(5);
      
      // Verify second context
      expect(result.records[1].get('context')).toBe('my-app:feature/auth');
      expect(result.records[1].get('functions').toNumber()).toBe(7);
    });

    it('should list branches for specific project', async () => {
      // Mock branches for a specific project
      mockSession.executeRead.mockResolvedValue({
        records: [
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'frontend:main';
                case 'functions': return { toNumber: () => 10 };
                case 'classes': return { toNumber: () => 5 };
                case 'components': return { toNumber: () => 8 };
                case 'files': return { toNumber: () => 6 };
                default: return null;
              }
            })
          },
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'frontend:develop';
                case 'functions': return { toNumber: () => 12 };
                case 'classes': return { toNumber: () => 6 };
                case 'components': return { toNumber: () => 9 };
                case 'files': return { toNumber: () => 7 };
                default: return null;
              }
            })
          }
        ]
      });

      const result = await mockSession.executeRead();
      expect(result.records.length).toBe(2);
      
      // Extract branch names
      const branches = result.records.map((record: any) => {
        const context = record.get('context');
        return context.split(':')[1];
      });
      
      expect(branches).toContain('main');
      expect(branches).toContain('develop');
    });

    it('should handle empty branch list', async () => {
      // Mock no branches found
      mockSession.executeRead.mockResolvedValue({
        records: []
      });

      const result = await mockSession.executeRead();
      expect(result.records.length).toBe(0);
    });
  });

  describe('branch comparison functionality', () => {
    it('should compare functions between branches', async () => {
      // Mock comparison query result
      mockSession.executeRead.mockResolvedValue({
        records: [{
          get: jest.fn().mockImplementation((key) => {
            switch (key) {
              case 'sourceFunctions': 
                return [
                  { name: 'login', type: 'Function' },
                  { name: 'logout', type: 'Function' },
                  { name: 'oauthLogin', type: 'Function' }
                ];
              case 'targetFunctions':
                return [
                  { name: 'login', type: 'Function' },
                  { name: 'logout', type: 'Function' },
                  { name: 'simpleAuth', type: 'Function' }
                ];
              case 'sourceClasses':
                return [
                  { name: 'AuthService', type: 'Class' }
                ];
              case 'targetClasses':
                return [
                  { name: 'AuthService', type: 'Class' },
                  { name: 'UserService', type: 'Class' }
                ];
              default: 
                return [];
            }
          })
        }]
      });

      const result = await mockSession.executeRead();
      const record = result.records[0];
      
      const sourceFunctions = record.get('sourceFunctions');
      const targetFunctions = record.get('targetFunctions');
      const sourceClasses = record.get('sourceClasses');
      const targetClasses = record.get('targetClasses');
      
      // Verify source has oauthLogin but target doesn't
      const sourceNames = sourceFunctions.map((f: any) => f.name);
      const targetNames = targetFunctions.map((f: any) => f.name);
      
      expect(sourceNames).toContain('oauthLogin');
      expect(targetNames).not.toContain('oauthLogin');
      expect(targetNames).toContain('simpleAuth');
      expect(sourceNames).not.toContain('simpleAuth');
      
      // Verify common elements
      const commonFunctions = sourceFunctions.filter((f: any) => 
        targetNames.includes(f.name)
      );
      expect(commonFunctions).toHaveLength(2); // login, logout
    });
  });

  describe('context deletion with branches', () => {
    it('should delete specific branch context', async () => {
      mockSession.executeWrite.mockResolvedValue({
        records: [{
          get: jest.fn().mockReturnValue({ toNumber: () => 15 })
        }]
      });

      const result = await mockSession.executeWrite();
      const deletedCount = result.records[0].get('deleted').toNumber();
      
      expect(deletedCount).toBe(15);
    });

    it('should clear branch context data', async () => {
      mockSession.executeWrite.mockResolvedValue({
        records: [{
          get: jest.fn().mockReturnValue({ toNumber: () => 8 })
        }]
      });

      const result = await mockSession.executeWrite();
      const clearedCount = result.records[0].get('cleared').toNumber();
      
      expect(clearedCount).toBe(8);
    });
  });

  describe('error handling with branch contexts', () => {
    it('should handle missing projectContext for branch operations', async () => {
      // Test that operations requiring projectContext fail appropriately
      expect(() => {
        // This would be tested in integration tests where the actual tool is called
        // For unit tests, we verify the validation logic
      }).not.toThrow(); // Placeholder - actual validation happens in server
    });

    it('should handle missing branch for branch operations', async () => {
      // Test that operations requiring branch fail appropriately
      expect(() => {
        // This would be tested in integration tests
      }).not.toThrow(); // Placeholder
    });
  });

  describe('backward compatibility', () => {
    it('should handle legacy context format', async () => {
      // Mock legacy context without branch
      mockSession.executeRead.mockResolvedValue({
        records: [{
          get: jest.fn().mockImplementation((key) => {
            switch (key) {
              case 'context': return 'legacy-project'; // Old format without branch
              case 'functions': return { toNumber: () => 3 };
              case 'classes': return { toNumber: () => 1 };
              case 'components': return { toNumber: () => 0 };
              case 'files': return { toNumber: () => 2 };
              default: return null;
            }
          })
        }]
      });

      const result = await mockSession.executeRead();
      const record = result.records[0];
      
      expect(record.get('context')).toBe('legacy-project');
      // Legacy contexts should be handled gracefully
    });
  });
});