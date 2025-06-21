// Mock implementation for server functions with branch support
// Accept variable number of arguments to support both old and new signatures
export const indexParsedCode = jest.fn((..._args: any[]) => {
  // Support both old signature (4 params) and new signature (6 params)
  return Promise.resolve(undefined);
});

// Mock function to generate context with branch support
export const generateContext = jest.fn((projectContext: string = 'default', branch: string = 'main'): string => {
  return `${projectContext}:${branch}`;
});

// Mock helper function to calculate similarity
export const calculateSimilarity = jest.fn((str1: string, str2: string): number => {
  const tokens1 = str1.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  const tokens2 = str2.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  
  const intersection = tokens1.filter(token => tokens2.includes(token));
  const union = [...new Set([...tokens1, ...tokens2])];
  
  return intersection.length / union.length;
});