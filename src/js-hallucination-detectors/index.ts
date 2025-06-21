/**
 * JavaScript/TypeScript Hallucination Detection Suite
 * 
 * This module provides comprehensive hallucination detection specifically
 * focused on the JavaScript/TypeScript ecosystem, covering:
 * 
 * - NPM package existence verification
 * - JavaScript native API validation
 * - React hooks and patterns validation
 * - Vue.js composables and directives validation
 * - Node.js built-in APIs and Express framework validation
 * 
 * Each detector focuses on preventing AI code hallucinations by validating
 * against real APIs, packages, and established patterns.
 */

// Core detectors
export { 
    NpmVerifier, 
    npmVerifier,
    type NpmPackageInfo,
    type NpmVerificationResult 
} from './npm-verifier';

export { 
    JSAPIValidator, 
    jsAPIValidator,
    type JSAPIValidationResult,
    type JSAPIIssue 
} from './js-api-validator';

// Framework-specific detectors
export { 
    ReactHallucinationDetector, 
    reactHallucinationDetector,
    type ReactHallucinationResult,
    type ReactHallucinationIssue 
} from './react-hallucination-detector';

export { 
    VueHallucinationDetector, 
    vueHallucinationDetector,
    type VueHallucinationResult,
    type VueHallucinationIssue 
} from './vue-hallucination-detector';

export { 
    NodeJSHallucinationDetector, 
    nodeJSHallucinationDetector,
    type NodeJSHallucinationResult,
    type NodeJSHallucinationIssue 
} from './nodejs-hallucination-detector';

/**
 * Comprehensive JavaScript/TypeScript hallucination detection
 * 
 * This function runs all available JS/TS detectors and provides
 * a unified result with overall confidence scoring.
 */
export interface ComprehensiveJSHallucinationResult {
    overall: {
        valid: boolean;
        confidence: number; // 0-100
        riskScore: number; // 0-100, higher is worse
    };
    packages: import('./npm-verifier').NpmVerificationResult | null;
    jsAPIs: import('./js-api-validator').JSAPIValidationResult | null;
    react: import('./react-hallucination-detector').ReactHallucinationResult | null;
    vue: import('./vue-hallucination-detector').VueHallucinationResult | null;
    nodejs: import('./nodejs-hallucination-detector').NodeJSHallucinationResult | null;
    summary: {
        totalIssues: number;
        criticalIssues: number;
        suggestions: string[];
    };
}

export interface JSHallucinationDetectionOptions {
    // Package detection
    checkPackages?: boolean;
    packageNames?: string[];
    
    // API validation
    checkJSAPIs?: boolean;
    environment?: 'browser' | 'node' | 'both';
    esVersion?: string;
    
    // Framework detection
    detectReact?: boolean;
    reactVersion?: string;
    
    detectVue?: boolean;
    vueVersion?: '2' | '3';
    
    detectNodeJS?: boolean;
    nodeVersion?: string;
    framework?: 'express' | 'fastify' | 'koa' | 'nest';
    
    // General options
    typescript?: boolean;
    strictMode?: boolean;
}

/**
 * Run comprehensive JavaScript/TypeScript hallucination detection
 */
export async function detectJSHallucinations(
    code: string,
    options: JSHallucinationDetectionOptions = {}
): Promise<ComprehensiveJSHallucinationResult> {
    const {
        checkPackages = true,
        checkJSAPIs = true,
        detectReact = false,
        detectVue = false,
        detectNodeJS = false,
        environment = 'both',
        typescript = false,
        strictMode = false
    } = options;
    
    const results: ComprehensiveJSHallucinationResult = {
        overall: {
            valid: true,
            confidence: 100,
            riskScore: 0
        },
        packages: null,
        jsAPIs: null,
        react: null,
        vue: null,
        nodejs: null,
        summary: {
            totalIssues: 0,
            criticalIssues: 0,
            suggestions: []
        }
    };
    
    // Extract package names from code if not provided
    let packageNames = options.packageNames;
    if (checkPackages && !packageNames) {
        packageNames = extractPackageNames(code);
    }
    
    try {
        // Import the detectors dynamically to avoid import issues
        const { npmVerifier } = await import('./npm-verifier');
        const { jsAPIValidator } = await import('./js-api-validator');
        const { reactHallucinationDetector } = await import('./react-hallucination-detector');
        const { vueHallucinationDetector } = await import('./vue-hallucination-detector');
        const { nodeJSHallucinationDetector } = await import('./nodejs-hallucination-detector');

        // Run package verification
        if (checkPackages && packageNames && packageNames.length > 0) {
            results.packages = await npmVerifier.verifyPackages(packageNames);
        }
        
        // Run JavaScript API validation
        if (checkJSAPIs) {
            results.jsAPIs = await jsAPIValidator.validateJSAPIs(code, {
                environment,
                typescript,
                strictMode
            });
        }
        
        // Run React detection
        if (detectReact || code.includes('react') || code.includes('useState') || code.includes('useEffect')) {
            results.react = await reactHallucinationDetector.detectReactHallucinations(code, {
                reactVersion: options.reactVersion,
                typescript,
                strictMode
            });
        }
        
        // Run Vue detection
        if (detectVue || code.includes('vue') || code.includes('ref(') || code.includes('reactive(')) {
            results.vue = await vueHallucinationDetector.detectVueHallucinations(code, {
                vueVersion: options.vueVersion,
                typescript,
                strictMode
            });
        }
        
        // Run Node.js detection
        if (detectNodeJS || code.includes('require(') || code.includes('fs.') || code.includes('express')) {
            results.nodejs = await nodeJSHallucinationDetector.detectNodeJSHallucinations(code, {
                nodeVersion: options.nodeVersion,
                framework: options.framework,
                typescript,
                strictMode
            });
        }
        
        // Calculate overall results
        calculateOverallResults(results);
        
    } catch (error) {
        console.error('Error during JS hallucination detection:', error);
        results.overall.confidence = 0;
        results.overall.riskScore = 100;
    }
    
    return results;
}

/**
 * Extract package names from import/require statements
 */
function extractPackageNames(code: string): string[] {
    const packages = new Set<string>();
    
    // Extract from require statements
    const requirePattern = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let match;
    while ((match = requirePattern.exec(code)) !== null) {
        const packageName = match[1];
        if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
            packages.add(packageName.split('/')[0]);
        }
    }
    
    // Extract from import statements
    const importPattern = /import\s+[^'"]*from\s*['"`]([^'"`]+)['"`]/g;
    while ((match = importPattern.exec(code)) !== null) {
        const packageName = match[1];
        if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
            packages.add(packageName.split('/')[0]);
        }
    }
    
    // Extract from dynamic imports
    const dynamicImportPattern = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((match = dynamicImportPattern.exec(code)) !== null) {
        const packageName = match[1];
        if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
            packages.add(packageName.split('/')[0]);
        }
    }
    
    return Array.from(packages);
}

/**
 * Calculate overall confidence and risk scores
 */
function calculateOverallResults(results: ComprehensiveJSHallucinationResult): void {
    let totalIssues = 0;
    let criticalIssues = 0;
    let totalScore = 0;
    let scoreCount = 0;
    const allSuggestions: string[] = [];
    
    // Aggregate package results
    if (results.packages) {
        totalIssues += results.packages.summary.hallucinated + results.packages.summary.suspicious;
        criticalIssues += results.packages.summary.hallucinated;
        allSuggestions.push(...results.packages.recommendations);
    }
    
    // Aggregate JS API results
    if (results.jsAPIs) {
        totalIssues += results.jsAPIs.issues.length;
        criticalIssues += results.jsAPIs.issues.filter((i: any) => i.severity === 'error').length;
        totalScore += results.jsAPIs.score;
        scoreCount++;
        allSuggestions.push(...results.jsAPIs.suggestions);
    }
    
    // Aggregate React results
    if (results.react) {
        totalIssues += results.react.issues.length;
        criticalIssues += results.react.issues.filter((i: any) => i.severity === 'error').length;
        totalScore += results.react.score;
        scoreCount++;
        allSuggestions.push(...results.react.suggestions);
    }
    
    // Aggregate Vue results
    if (results.vue) {
        totalIssues += results.vue.issues.length;
        criticalIssues += results.vue.issues.filter((i: any) => i.severity === 'error').length;
        totalScore += results.vue.score;
        scoreCount++;
        allSuggestions.push(...results.vue.suggestions);
    }
    
    // Aggregate Node.js results
    if (results.nodejs) {
        totalIssues += results.nodejs.issues.length;
        criticalIssues += results.nodejs.issues.filter((i: any) => i.severity === 'error').length;
        totalScore += results.nodejs.score;
        scoreCount++;
        allSuggestions.push(...results.nodejs.suggestions);
    }
    
    // Calculate overall metrics
    const averageScore = scoreCount > 0 ? totalScore / scoreCount : 100;
    const riskScore = Math.min(100, criticalIssues * 20 + (totalIssues - criticalIssues) * 10);
    
    results.overall = {
        valid: criticalIssues === 0,
        confidence: Math.max(0, averageScore),
        riskScore
    };
    
    results.summary = {
        totalIssues,
        criticalIssues,
        suggestions: [...new Set(allSuggestions)]
    };
}

/**
 * Quick validation for common JavaScript patterns
 */
export function quickValidateJS(code: string): { 
    valid: boolean; 
    issues: string[]; 
    confidence: number; 
} {
    const issues: string[] = [];
    
    // Quick checks for obvious hallucinations
    const quickChecks = [
        { pattern: /Array\.shuffle\s*\(/, message: 'Array.shuffle() não existe' },
        { pattern: /Object\.isEmpty\s*\(/, message: 'Object.isEmpty() não existe' },
        { pattern: /String\.format\s*\(/, message: 'String.format() não existe' },
        { pattern: /useAsync\s*\(/, message: 'useAsync hook não existe no React' },
        { pattern: /useFetch\s*\(/, message: 'useFetch hook não existe no React' },
        { pattern: /Vue\.fetch\s*\(/, message: 'Vue.fetch() não existe' },
        { pattern: /fs\.readFileAsync\s*\(/, message: 'fs.readFileAsync() não existe' },
        { pattern: /express\.bodyParser\s*\(/, message: 'express.bodyParser foi removido' }
    ];
    
    for (const check of quickChecks) {
        if (check.pattern.test(code)) {
            issues.push(check.message);
        }
    }
    
    const confidence = Math.max(0, 100 - (issues.length * 20));
    
    return {
        valid: issues.length === 0,
        issues,
        confidence
    };
}