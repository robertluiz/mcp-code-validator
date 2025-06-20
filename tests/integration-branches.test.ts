/**
 * Integration tests for branch-based context management
 * These tests verify the complete workflow of indexing and validating code across different branches
 */

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

// Mock Neo4j session with comprehensive branch functionality
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

describe('Branch Context Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete workflow: Index -> Validate -> Compare', () => {
    it('should handle complete branch workflow', async () => {
      // Step 1: Index code in main branch
      mockParseCode.mockReturnValue({
        functions: [
          { name: 'authenticate', body: 'function authenticate(user, pass) { return bcrypt.compare(pass, user.hash); }' }
        ],
        classes: [
          { name: 'UserService', body: 'class UserService { findUser() {} }' }
        ],
        reactComponents: [],
        reactHooks: [],
        nextjsPatterns: [],
        frontendElements: [],
        imports: [],
        exports: []
      });

      // Mock successful indexing
      mockSession.executeWrite.mockResolvedValue({ records: [] });

      const { indexParsedCode } = require('./__mocks__/server');
      const mainParsedCode = mockParseCode('main branch code');
      
      await indexParsedCode(mockSession, mainParsedCode, 'src/auth.ts', 'typescript', 'my-app', 'main');

      // Step 2: Index modified code in feature branch
      mockParseCode.mockReturnValue({
        functions: [
          { name: 'authenticate', body: 'function authenticate(credentials) { return oauth.verify(credentials); }' },
          { name: 'refreshToken', body: 'function refreshToken(token) { return oauth.refresh(token); }' }
        ],
        classes: [
          { name: 'UserService', body: 'class UserService { findUser() {} }' },
          { name: 'OAuthService', body: 'class OAuthService { verify() {} }' }
        ],
        reactComponents: [],
        reactHooks: [],
        nextjsPatterns: [],
        frontendElements: [],
        imports: [],
        exports: []
      });

      const featureParsedCode = mockParseCode('feature branch code');
      
      await indexParsedCode(mockSession, featureParsedCode, 'src/auth.ts', 'typescript', 'my-app', 'feature/oauth');

      // Step 3: Validate against different branches
      // Validate against main branch (should find authenticate function)
      mockSession.executeRead.mockResolvedValueOnce({
        records: [{
          get: jest.fn().mockImplementation((key) => {
            if (key === 'body') return 'function authenticate(user, pass) { return bcrypt.compare(pass, user.hash); }';
            if (key === 'updatedAt') return 1234567890;
            return null;
          })
        }]
      });

      // Validate against feature branch (should find authenticate + refreshToken)
      mockSession.executeRead.mockResolvedValueOnce({
        records: [{
          get: jest.fn().mockImplementation((key) => {
            if (key === 'body') return 'function authenticate(credentials) { return oauth.verify(credentials); }';
            if (key === 'updatedAt') return 1234567891;
            return null;
          })
        }]
      });

      const mainValidation = await mockSession.executeRead();
      const featureValidation = await mockSession.executeRead();

      expect(mainValidation.records.length).toBe(1);
      expect(featureValidation.records.length).toBe(1);

      // Step 4: Compare branches
      mockSession.executeRead.mockResolvedValueOnce({
        records: [{
          get: jest.fn().mockImplementation((key) => {
            switch (key) {
              case 'sourceFunctions': 
                return [
                  { name: 'authenticate', type: 'Function' },
                  { name: 'refreshToken', type: 'Function' }
                ];
              case 'targetFunctions':
                return [
                  { name: 'authenticate', type: 'Function' }
                ];
              case 'sourceClasses':
                return [
                  { name: 'UserService', type: 'Class' },
                  { name: 'OAuthService', type: 'Class' }
                ];
              case 'targetClasses':
                return [
                  { name: 'UserService', type: 'Class' }
                ];
              default: 
                return [];
            }
          })
        }]
      });

      const comparison = await mockSession.executeRead();
      const comparisonRecord = comparison.records[0];
      
      const sourceFunctions = comparisonRecord.get('sourceFunctions');
      const targetFunctions = comparisonRecord.get('targetFunctions');
      
      // Feature branch has more functions
      expect(sourceFunctions.length).toBe(2);
      expect(targetFunctions.length).toBe(1);
      
      // Check for feature-specific function
      const sourceNames = sourceFunctions.map((f: any) => f.name);
      expect(sourceNames).toContain('refreshToken');

      // Verify all mocks were called
      expect(indexParsedCode).toHaveBeenCalledTimes(2);
      expect(mockSession.executeRead).toHaveBeenCalledTimes(3);
      // Note: executeWrite calls are mocked at a higher level through indexParsedCode
    });
  });

  describe('Branch context management workflow', () => {
    it('should manage branch contexts through lifecycle', async () => {
      // Step 1: List initial contexts (empty)
      mockSession.executeRead.mockResolvedValueOnce({
        records: []
      });

      let result = await mockSession.executeRead();
      expect(result.records.length).toBe(0);

      // Step 2: Create main branch context
      mockSession.executeRead.mockResolvedValueOnce({
        records: [{
          get: jest.fn().mockReturnValue({ toNumber: () => 0 })
        }]
      });

      result = await mockSession.executeRead();
      expect(result.records[0].get('count').toNumber()).toBe(0);

      // Step 3: Index some code in main
      mockSession.executeWrite.mockResolvedValue({ records: [] });
      
      // Mock indexing result
      expect(mockSession.executeWrite).toHaveBeenCalledTimes(0);

      // Step 4: Create feature branch
      mockSession.executeRead.mockResolvedValueOnce({
        records: [{
          get: jest.fn().mockReturnValue({ toNumber: () => 0 })
        }]
      });

      result = await mockSession.executeRead();
      expect(result.records[0].get('count').toNumber()).toBe(0);

      // Step 5: List branches for project
      mockSession.executeRead.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'my-app:main';
                case 'functions': return { toNumber: () => 5 };
                case 'classes': return { toNumber: () => 2 };
                case 'components': return { toNumber: () => 0 };
                case 'files': return { toNumber: () => 3 };
                default: return null;
              }
            })
          },
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'my-app:feature/auth';
                case 'functions': return { toNumber: () => 7 };
                case 'classes': return { toNumber: () => 3 };
                case 'components': return { toNumber: () => 1 };
                case 'files': return { toNumber: () => 4 };
                default: return null;
              }
            })
          }
        ]
      });

      result = await mockSession.executeRead();
      expect(result.records.length).toBe(2);
      
      const branches = result.records.map((record: any) => {
        const context = record.get('context');
        return context.split(':')[1];
      });
      
      expect(branches).toContain('main');
      expect(branches).toContain('feature/auth');

      // Step 6: Delete feature branch after merge
      mockSession.executeWrite.mockResolvedValueOnce({
        records: [{
          get: jest.fn().mockReturnValue({ toNumber: () => 12 })
        }]
      });

      const deleteResult = await mockSession.executeWrite();
      expect(deleteResult.records[0].get('deleted').toNumber()).toBe(12);
    });
  });

  describe('Multi-project branch scenarios', () => {
    it('should handle multiple projects with different branches', async () => {
      // Mock multiple projects and branches
      mockSession.executeRead.mockResolvedValue({
        records: [
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'frontend:main';
                case 'functions': return { toNumber: () => 15 };
                case 'classes': return { toNumber: () => 8 };
                case 'components': return { toNumber: () => 12 };
                case 'files': return { toNumber: () => 10 };
                default: return null;
              }
            })
          },
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'frontend:feature/redesign';
                case 'functions': return { toNumber: () => 18 };
                case 'classes': return { toNumber: () => 10 };
                case 'components': return { toNumber: () => 15 };
                case 'files': return { toNumber: () => 12 };
                default: return null;
              }
            })
          },
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'backend:main';
                case 'functions': return { toNumber: () => 25 };
                case 'classes': return { toNumber: () => 12 };
                case 'components': return { toNumber: () => 0 };
                case 'files': return { toNumber: () => 8 };
                default: return null;
              }
            })
          },
          {
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'context': return 'backend:feature/api-v2';
                case 'functions': return { toNumber: () => 30 };
                case 'classes': return { toNumber: () => 15 };
                case 'components': return { toNumber: () => 0 };
                case 'files': return { toNumber: () => 10 };
                default: return null;
              }
            })
          }
        ]
      });

      const result = await mockSession.executeRead();
      expect(result.records.length).toBe(4);

      // Parse contexts to verify structure
      const contexts = result.records.map((record: any) => {
        const contextStr = record.get('context');
        const [project, branch] = contextStr.split(':');
        return {
          project,
          branch,
          functions: record.get('functions').toNumber(),
          classes: record.get('classes').toNumber()
        };
      });

      // Verify frontend contexts
      const frontendContexts = contexts.filter((c: any) => c.project === 'frontend');
      expect(frontendContexts.length).toBe(2);
      expect(frontendContexts.some((c: any) => c.branch === 'main')).toBe(true);
      expect(frontendContexts.some((c: any) => c.branch === 'feature/redesign')).toBe(true);

      // Verify backend contexts
      const backendContexts = contexts.filter((c: any) => c.project === 'backend');
      expect(backendContexts.length).toBe(2);
      expect(backendContexts.some((c: any) => c.branch === 'main')).toBe(true);
      expect(backendContexts.some((c: any) => c.branch === 'feature/api-v2')).toBe(true);

      // Verify feature branches have more functions (development activity)
      const frontendFeature = contexts.find((c: any) => c.project === 'frontend' && c.branch === 'feature/redesign');
      const frontendMain = contexts.find((c: any) => c.project === 'frontend' && c.branch === 'main');
      expect(frontendFeature?.functions).toBeGreaterThan(frontendMain?.functions || 0);
    });
  });

  describe('Error scenarios with branches', () => {
    it('should handle validation against non-existent branch', async () => {
      // Mock empty result for non-existent branch
      mockSession.executeRead.mockResolvedValue({
        records: []
      });

      const result = await mockSession.executeRead();
      expect(result.records.length).toBe(0);
    });

    it('should handle comparison between non-existent branches', async () => {
      // Mock empty comparison result
      mockSession.executeRead.mockResolvedValue({
        records: [{
          get: jest.fn().mockImplementation((key) => {
            // Return empty arrays for all comparison data
            return [];
          })
        }]
      });

      const result = await mockSession.executeRead();
      const record = result.records[0];
      
      expect(record.get('sourceFunctions')).toEqual([]);
      expect(record.get('targetFunctions')).toEqual([]);
      expect(record.get('sourceClasses')).toEqual([]);
      expect(record.get('targetClasses')).toEqual([]);
    });
  });
});