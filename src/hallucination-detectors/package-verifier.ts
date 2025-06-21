/**
 * Package existence verification tool
 * Detects hallucinated package names across multiple registries
 */

import fetch from 'node-fetch';
import * as semver from 'semver';

export interface PackageInfo {
    exists: boolean;
    name: string;
    version?: string;
    registry: string;
    metadata?: {
        description?: string;
        maintainers?: string[];
        lastPublished?: Date;
        downloads?: number;
        deprecated?: boolean;
    };
    security?: {
        hasVulnerabilities?: boolean;
        vulnerabilityCount?: number;
        isMalicious?: boolean;
    };
    suggestions?: string[];
}

export interface VerificationResult {
    packages: PackageInfo[];
    summary: {
        total: number;
        existing: number;
        missing: number;
        suspicious: number;
        deprecated: number;
    };
    hallucinations: {
        packageName: string;
        confidence: number;
        reason: string;
        alternatives?: string[];
    }[];
}

// Known malicious package patterns
const MALICIOUS_PATTERNS = [
    /^node-sass$/i, // Common typosquatting
    /^crossenv$/i,  // Known malicious package
    /^mongose$/i,   // Typo of mongoose
    /^expres$/i,    // Typo of express
    /^lodassh$/i,   // Typo of lodash
    /^requst$/i,    // Typo of request
];

// Common hallucinated package name patterns
const HALLUCINATION_PATTERNS = [
    /^(magic|super|ultra|mega|auto|smart|ai|ml)-/i,
    /-helper$|-utils$|-tool$|-manager$|-handler$/i,
    /^(universal|automatic|intelligent|dynamic|advanced)-/i,
];

// Registry configurations
const REGISTRIES = {
    npm: {
        url: 'https://registry.npmjs.org',
        checkUrl: (pkg: string) => `https://registry.npmjs.org/${pkg}`,
        metadataUrl: (pkg: string) => `https://registry.npmjs.org/${pkg}`,
        searchUrl: (query: string) => `https://registry.npmjs.org/-/v1/search?text=${query}&size=5`
    },
    pypi: {
        url: 'https://pypi.org',
        checkUrl: (pkg: string) => `https://pypi.org/pypi/${pkg}/json`,
        metadataUrl: (pkg: string) => `https://pypi.org/pypi/${pkg}/json`,
        searchUrl: (query: string) => `https://pypi.org/pypi/${query}/json`
    },
    maven: {
        url: 'https://search.maven.org',
        checkUrl: (pkg: string) => {
            const [groupId, artifactId] = pkg.split(':');
            return `https://search.maven.org/solrsearch/select?q=g:"${groupId}"+AND+a:"${artifactId}"&rows=1&wt=json`;
        },
        metadataUrl: (pkg: string) => {
            const [groupId, artifactId] = pkg.split(':');
            return `https://search.maven.org/solrsearch/select?q=g:"${groupId}"+AND+a:"${artifactId}"&rows=1&wt=json`;
        },
        searchUrl: (query: string) => `https://search.maven.org/solrsearch/select?q=${query}&rows=5&wt=json`
    }
};

export class PackageVerifier {
    private cache: Map<string, PackageInfo> = new Map();
    private knownMalicious: Set<string> = new Set();
    
    constructor() {
        // Initialize with known malicious packages
        this.knownMalicious.add('crossenv');
        this.knownMalicious.add('node-sass');
        this.knownMalicious.add('eslint-scope@3.7.2');
    }
    
    /**
     * Verify multiple packages across registries
     */
    async verifyPackages(
        packages: Array<{ name: string; version?: string; registry: 'npm' | 'pypi' | 'maven' }>,
        projectType?: string
    ): Promise<VerificationResult> {
        const results: PackageInfo[] = [];
        const hallucinations: VerificationResult['hallucinations'] = [];
        
        for (const pkg of packages) {
            const cacheKey = `${pkg.registry}:${pkg.name}:${pkg.version || 'latest'}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                results.push(this.cache.get(cacheKey)!);
                continue;
            }
            
            const packageInfo = await this.verifyPackage(pkg.name, pkg.registry, pkg.version);
            results.push(packageInfo);
            
            // Cache the result
            this.cache.set(cacheKey, packageInfo);
            
            // Check for hallucinations
            if (!packageInfo.exists) {
                const hallucination = this.detectHallucination(pkg.name, pkg.registry);
                if (hallucination) {
                    hallucinations.push(hallucination);
                }
            }
        }
        
        // Calculate summary
        const summary = {
            total: results.length,
            existing: results.filter(p => p.exists).length,
            missing: results.filter(p => !p.exists).length,
            suspicious: results.filter(p => p.security?.isMalicious).length,
            deprecated: results.filter(p => p.metadata?.deprecated).length
        };
        
        return { packages: results, summary, hallucinations };
    }
    
    /**
     * Verify a single package
     */
    private async verifyPackage(
        packageName: string, 
        registry: 'npm' | 'pypi' | 'maven',
        version?: string
    ): Promise<PackageInfo> {
        const registryConfig = REGISTRIES[registry];
        
        try {
            // Check if package exists
            const checkUrl = registryConfig.checkUrl(packageName);
            const response = await fetch(checkUrl);
            
            if (!response.ok) {
                // Package doesn't exist, try to find alternatives
                const suggestions = await this.findSimilarPackages(packageName, registry);
                
                return {
                    exists: false,
                    name: packageName,
                    version,
                    registry,
                    suggestions
                };
            }
            
            // Parse metadata based on registry
            const metadata = await this.parseMetadata(response, registry);
            
            // Check for security issues
            const security = await this.checkSecurity(packageName, registry);
            
            return {
                exists: true,
                name: packageName,
                version: version || metadata.version,
                registry,
                metadata,
                security
            };
            
        } catch (error) {
            console.error(`Error verifying package ${packageName}:`, error);
            return {
                exists: false,
                name: packageName,
                version,
                registry
            };
        }
    }
    
    /**
     * Parse metadata from registry response
     */
    private async parseMetadata(response: Response, registry: string): Promise<any> {
        const data = await response.json();
        
        switch (registry) {
            case 'npm':
                return {
                    description: data.description,
                    version: data['dist-tags']?.latest,
                    maintainers: data.maintainers?.map((m: any) => m.name),
                    lastPublished: data.time?.modified,
                    deprecated: data.deprecated
                };
                
            case 'pypi':
                return {
                    description: data.info?.summary,
                    version: data.info?.version,
                    maintainers: [data.info?.author].filter(Boolean),
                    lastPublished: data.releases?.[data.info?.version]?.[0]?.upload_time
                };
                
            case 'maven':
                const doc = data.response?.docs?.[0];
                return {
                    description: doc?.description,
                    version: doc?.latestVersion,
                    lastPublished: doc?.timestamp
                };
                
            default:
                return {};
        }
    }
    
    /**
     * Check for security issues
     */
    private async checkSecurity(packageName: string, registry: string): Promise<any> {
        // Check against known malicious packages
        if (this.knownMalicious.has(packageName)) {
            return {
                hasVulnerabilities: true,
                vulnerabilityCount: 1,
                isMalicious: true
            };
        }
        
        // Check against malicious patterns
        const isSuspicious = MALICIOUS_PATTERNS.some(pattern => pattern.test(packageName));
        
        if (isSuspicious) {
            return {
                hasVulnerabilities: false,
                vulnerabilityCount: 0,
                isMalicious: true
            };
        }
        
        // TODO: Integrate with vulnerability databases (Snyk, npm audit, etc.)
        
        return {
            hasVulnerabilities: false,
            vulnerabilityCount: 0,
            isMalicious: false
        };
    }
    
    /**
     * Find similar packages that might be the intended package
     */
    private async findSimilarPackages(packageName: string, registry: string): Promise<string[]> {
        const suggestions: string[] = [];
        
        // Common typo corrections
        const typoCorrections: Record<string, string[]> = {
            'expres': ['express'],
            'mongose': ['mongoose'],
            'lodassh': ['lodash'],
            'requst': ['request'],
            'moment-js': ['moment'],
            'angular-cli': ['@angular/cli'],
            'react-native-cli': ['react-native'],
            'huggingface-cli': ['huggingface-hub']
        };
        
        if (typoCorrections[packageName]) {
            suggestions.push(...typoCorrections[packageName]);
        }
        
        // Try searching for similar packages
        try {
            const searchUrl = REGISTRIES[registry].searchUrl(packageName);
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                
                switch (registry) {
                    case 'npm':
                        const npmPackages = data.objects?.map((obj: any) => obj.package.name) || [];
                        suggestions.push(...npmPackages.slice(0, 3));
                        break;
                        
                    case 'pypi':
                        // PyPI search is different, would need custom implementation
                        break;
                        
                    case 'maven':
                        const mavenPackages = data.response?.docs?.map((doc: any) => 
                            `${doc.g}:${doc.a}`
                        ) || [];
                        suggestions.push(...mavenPackages.slice(0, 3));
                        break;
                }
            }
        } catch (error) {
            console.error('Error searching for similar packages:', error);
        }
        
        return [...new Set(suggestions)]; // Remove duplicates
    }
    
    /**
     * Detect if a package name is likely hallucinated
     */
    private detectHallucination(packageName: string, registry: string): any {
        let confidence = 0;
        const reasons: string[] = [];
        
        // Check against hallucination patterns
        for (const pattern of HALLUCINATION_PATTERNS) {
            if (pattern.test(packageName)) {
                confidence += 0.3;
                reasons.push(`Matches hallucination pattern: ${pattern}`);
            }
        }
        
        // Check for overly generic names
        if (packageName.length < 5 && !['vue', 'react', 'express'].includes(packageName)) {
            confidence += 0.2;
            reasons.push('Overly generic name');
        }
        
        // Check for AI-related prefixes (common in hallucinations)
        if (/^(ai|ml|smart|auto|magic)-/.test(packageName)) {
            confidence += 0.4;
            reasons.push('Contains AI-related prefix commonly seen in hallucinations');
        }
        
        // Check for impossible combinations
        if (registry === 'npm' && packageName.includes('::')) {
            confidence += 0.5;
            reasons.push('Invalid npm package name format');
        }
        
        if (confidence > 0.5) {
            return {
                packageName,
                confidence: Math.min(confidence, 1),
                reason: reasons.join('; '),
                alternatives: [] // Will be populated by findSimilarPackages
            };
        }
        
        return null;
    }
}

// Export singleton instance
export const packageVerifier = new PackageVerifier();