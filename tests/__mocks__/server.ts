// Mock implementation for server functions
export const indexParsedCode = jest.fn().mockResolvedValue(undefined);

// Mock helper function to calculate similarity
export const calculateSimilarity = jest.fn((str1: string, str2: string): number => {
  const tokens1 = str1.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  const tokens2 = str2.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  
  const intersection = tokens1.filter(token => tokens2.includes(token));
  const union = [...new Set([...tokens1, ...tokens2])];
  
  return intersection.length / union.length;
});