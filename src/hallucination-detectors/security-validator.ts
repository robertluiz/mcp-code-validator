/**
 * Security vulnerability detector for AI-generated code
 * Identifies security risks and hallucinated security patterns
 */

export interface SecurityValidationResult {
    secure: boolean;
    vulnerabilities: SecurityVulnerability[];
    riskScore: number; // 0-100, higher is worse
    recommendations: string[];
}

export interface SecurityVulnerability {
    type: 'injection' | 'xss' | 'auth' | 'crypto' | 'secrets' | 'deserialization' | 'path-traversal' | 'command-injection';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    location: {
        line?: number;
        functionName?: string;
        pattern: string;
    };
    cwe?: string; // Common Weakness Enumeration ID
    fix?: string;
}

export class SecurityValidator {
    /**
     * Validate code for security vulnerabilities
     */
    async validateSecurity(
        code: string,
        language: string,
        context?: {
            userInputSources?: string[];
            sensitiveDataPatterns?: string[];
            framework?: string;
        }
    ): Promise<SecurityValidationResult> {
        const vulnerabilities: SecurityVulnerability[] = [];
        const recommendations: string[] = [];
        
        // Run all security checks
        this.detectInjectionVulnerabilities(code, language, vulnerabilities, recommendations);
        this.detectXSSVulnerabilities(code, language, vulnerabilities, recommendations);
        this.detectAuthenticationIssues(code, vulnerabilities, recommendations);
        this.detectCryptographyIssues(code, vulnerabilities, recommendations);
        this.detectHardcodedSecrets(code, vulnerabilities, recommendations);
        this.detectDeserializationIssues(code, language, vulnerabilities, recommendations);
        this.detectPathTraversal(code, vulnerabilities, recommendations);
        this.detectCommandInjection(code, language, vulnerabilities, recommendations);
        
        // Calculate risk score
        const riskScore = this.calculateRiskScore(vulnerabilities);
        
        return {
            secure: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
            vulnerabilities,
            riskScore,
            recommendations: [...new Set(recommendations)]
        };
    }
    
    /**
     * Detect SQL/NoSQL injection vulnerabilities
     */
    private detectInjectionVulnerabilities(
        code: string,
        language: string,
        vulnerabilities: SecurityVulnerability[],
        recommendations: string[]
    ): void {
        // SQL Injection patterns
        const sqlInjectionPatterns = [
            {
                pattern: /query\s*\(\s*["'`].*\+.*["'`]/g,
                description: 'SQL query with string concatenation'
            },
            {
                pattern: /query\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/g,
                description: 'SQL query with template literal interpolation'
            },
            {
                pattern: /execute\s*\(\s*["'`].*\+.*["'`]/g,
                description: 'SQL execute with string concatenation'
            },
            {
                pattern: /where\s*\(\s*["'`].*=.*["'`]\s*\+/gi,
                description: 'WHERE clause with concatenation'
            }
        ];
        
        for (const { pattern, description } of sqlInjectionPatterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                vulnerabilities.push({
                    type: 'injection',
                    severity: 'critical',
                    description: `SQL Injection vulnerability: ${description}`,
                    location: {
                        pattern: match[0]
                    },
                    cwe: 'CWE-89',
                    fix: 'Use parameterized queries or prepared statements'
                });
                
                recommendations.push('Always use parameterized queries to prevent SQL injection');
            }
        }
        
        // NoSQL Injection patterns (MongoDB)
        const noSqlPatterns = [
            {
                pattern: /\$where.*:.*\+/g,
                description: 'MongoDB $where clause with concatenation'
            },
            {
                pattern: /find\s*\(\s*\{[^}]*\[[^\]]+\][^}]*\}/g,
                description: 'MongoDB query with bracket notation'
            }
        ];
        
        for (const { pattern, description } of noSqlPatterns) {
            if (pattern.test(code)) {
                vulnerabilities.push({
                    type: 'injection',
                    severity: 'high',
                    description: `NoSQL Injection vulnerability: ${description}`,
                    location: {
                        pattern: pattern.source
                    },
                    cwe: 'CWE-943',
                    fix: 'Sanitize user input and avoid dynamic query construction'
                });
            }
        }
    }
    
    /**
     * Detect XSS vulnerabilities
     */
    private detectXSSVulnerabilities(
        code: string,
        language: string,
        vulnerabilities: SecurityVulnerability[],
        recommendations: string[]
    ): void {
        const xssPatterns = [
            {
                pattern: /innerHTML\s*=\s*[^'"]+[+`]/g,
                description: 'innerHTML with concatenation or interpolation',
                severity: 'critical' as const
            },
            {
                pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*[^}]+\+/g,
                description: 'React dangerouslySetInnerHTML with concatenation',
                severity: 'critical' as const
            },
            {
                pattern: /document\.write\s*\([^)]*\+/g,
                description: 'document.write with concatenation',
                severity: 'high' as const
            },
            {
                pattern: /eval\s*\([^)]*\+/g,
                description: 'eval with concatenation',
                severity: 'critical' as const
            },
            {
                pattern: /v-html\s*=\s*["'][^"']*\+/g,
                description: 'Vue v-html with concatenation',
                severity: 'critical' as const
            }
        ];
        
        for (const { pattern, description, severity } of xssPatterns) {
            if (pattern.test(code)) {
                vulnerabilities.push({
                    type: 'xss',
                    severity,
                    description: `XSS vulnerability: ${description}`,
                    location: {
                        pattern: pattern.source
                    },
                    cwe: 'CWE-79',
                    fix: 'Sanitize user input and use safe DOM manipulation methods'
                });
                
                recommendations.push('Use textContent instead of innerHTML, or sanitize HTML content');
            }
        }
    }
    
    /**
     * Detect authentication issues
     */
    private detectAuthenticationIssues(
        code: string,
        vulnerabilities: SecurityVulnerability[],
        recommendations: string[]
    ): void {
        // Weak password validation
        if (code.includes('password.length') && code.match(/password\.length\s*[<>]=?\s*[1-7]\b/)) {
            vulnerabilities.push({
                type: 'auth',
                severity: 'medium',
                description: 'Weak password validation (length < 8)',
                location: {
                    pattern: 'password.length check'
                },
                cwe: 'CWE-521',
                fix: 'Require passwords of at least 8 characters with complexity requirements'
            });
        }
        
        // Plain text password comparison
        if (code.match(/password\s*===?\s*["'`]/)) {
            vulnerabilities.push({
                type: 'auth',
                severity: 'critical',
                description: 'Plain text password comparison',
                location: {
                    pattern: 'password === comparison'
                },
                cwe: 'CWE-256',
                fix: 'Use bcrypt or similar for password hashing and comparison'
            });
        }
        
        // JWT without verification
        if (code.includes('jwt.decode') && !code.includes('jwt.verify')) {
            vulnerabilities.push({
                type: 'auth',
                severity: 'high',
                description: 'JWT decoded without verification',
                location: {
                    pattern: 'jwt.decode without jwt.verify'
                },
                cwe: 'CWE-347',
                fix: 'Always use jwt.verify() instead of jwt.decode()'
            });
            
            recommendations.push('Always verify JWT tokens, never just decode them');
        }
        
        // Session fixation
        if (code.includes('session.id') && code.includes('req.query')) {
            vulnerabilities.push({
                type: 'auth',
                severity: 'high',
                description: 'Potential session fixation vulnerability',
                location: {
                    pattern: 'session.id from query parameters'
                },
                cwe: 'CWE-384',
                fix: 'Regenerate session ID after authentication'
            });
        }
    }
    
    /**
     * Detect cryptography issues
     */
    private detectCryptographyIssues(
        code: string,
        vulnerabilities: SecurityVulnerability[],
        recommendations: string[]
    ): void {
        // Weak crypto algorithms
        const weakAlgorithms = [
            { pattern: /MD5/gi, name: 'MD5' },
            { pattern: /SHA1/gi, name: 'SHA1' },
            { pattern: /DES/g, name: 'DES' },
            { pattern: /RC4/gi, name: 'RC4' }
        ];
        
        for (const { pattern, name } of weakAlgorithms) {
            if (pattern.test(code)) {
                vulnerabilities.push({
                    type: 'crypto',
                    severity: 'high',
                    description: `Weak cryptographic algorithm: ${name}`,
                    location: {
                        pattern: name
                    },
                    cwe: 'CWE-327',
                    fix: `Use stronger algorithms: SHA-256, AES, etc.`
                });
            }
        }
        
        // Hardcoded IV or salt
        if (code.match(/iv\s*[:=]\s*["'][a-fA-F0-9]+["']/)) {
            vulnerabilities.push({
                type: 'crypto',
                severity: 'high',
                description: 'Hardcoded initialization vector (IV)',
                location: {
                    pattern: 'iv = hardcoded value'
                },
                cwe: 'CWE-329',
                fix: 'Generate random IV for each encryption operation'
            });
        }
        
        // Math.random for crypto
        if (code.includes('Math.random') && (code.includes('token') || code.includes('key') || code.includes('secret'))) {
            vulnerabilities.push({
                type: 'crypto',
                severity: 'critical',
                description: 'Math.random used for cryptographic purposes',
                location: {
                    pattern: 'Math.random for tokens/keys'
                },
                cwe: 'CWE-338',
                fix: 'Use crypto.randomBytes() or similar cryptographically secure random generator'
            });
            
            recommendations.push('Never use Math.random() for security-sensitive operations');
        }
    }
    
    /**
     * Detect hardcoded secrets
     */
    private detectHardcodedSecrets(
        code: string,
        vulnerabilities: SecurityVulnerability[],
        recommendations: string[]
    ): void {
        // API key patterns
        const secretPatterns = [
            {
                pattern: /api[_-]?key\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/gi,
                type: 'API key'
            },
            {
                pattern: /secret\s*[:=]\s*["'][a-zA-Z0-9]{10,}["']/gi,
                type: 'Secret'
            },
            {
                pattern: /password\s*[:=]\s*["'][^"']+["']/gi,
                type: 'Password'
            },
            {
                pattern: /token\s*[:=]\s*["'][a-zA-Z0-9._-]{20,}["']/gi,
                type: 'Token'
            },
            {
                pattern: /aws[_-]?access[_-]?key[_-]?id\s*[:=]\s*["'][A-Z0-9]{20}["']/gi,
                type: 'AWS Access Key'
            },
            {
                pattern: /private[_-]?key\s*[:=]\s*["']-----BEGIN/gi,
                type: 'Private Key'
            }
        ];
        
        for (const { pattern, type } of secretPatterns) {
            if (pattern.test(code)) {
                vulnerabilities.push({
                    type: 'secrets',
                    severity: 'critical',
                    description: `Hardcoded ${type} detected`,
                    location: {
                        pattern: pattern.source
                    },
                    cwe: 'CWE-798',
                    fix: 'Use environment variables or secure key management service'
                });
                
                recommendations.push(`Never hardcode ${type.toLowerCase()}s in source code`);
            }
        }
    }
    
    /**
     * Detect deserialization issues
     */
    private detectDeserializationIssues(
        code: string,
        language: string,
        vulnerabilities: SecurityVulnerability[],
        recommendations: string[]
    ): void {
        // JavaScript/Node.js
        if (language === 'javascript' || language === 'typescript') {
            if (code.includes('eval(') && code.includes('JSON')) {
                vulnerabilities.push({
                    type: 'deserialization',
                    severity: 'critical',
                    description: 'eval() used for JSON parsing',
                    location: {
                        pattern: 'eval with JSON'
                    },
                    cwe: 'CWE-502',
                    fix: 'Use JSON.parse() instead of eval()'
                });
            }
            
            if (code.match(/new\s+Function\s*\([^)]*JSON/)) {
                vulnerabilities.push({
                    type: 'deserialization',
                    severity: 'high',
                    description: 'Function constructor with user input',
                    location: {
                        pattern: 'new Function with JSON'
                    },
                    cwe: 'CWE-502',
                    fix: 'Avoid dynamic code generation from user input'
                });
            }
        }
        
        // Python
        if (language === 'python') {
            if (code.includes('pickle.loads') || code.includes('cPickle.loads')) {
                vulnerabilities.push({
                    type: 'deserialization',
                    severity: 'critical',
                    description: 'Unsafe pickle deserialization',
                    location: {
                        pattern: 'pickle.loads'
                    },
                    cwe: 'CWE-502',
                    fix: 'Use JSON or other safe serialization formats'
                });
            }
        }
        
        // Java
        if (language === 'java') {
            if (code.includes('ObjectInputStream') && code.includes('readObject')) {
                vulnerabilities.push({
                    type: 'deserialization',
                    severity: 'critical',
                    description: 'Unsafe Java deserialization',
                    location: {
                        pattern: 'ObjectInputStream.readObject'
                    },
                    cwe: 'CWE-502',
                    fix: 'Implement deserialization filters or use safe alternatives'
                });
            }
        }
    }
    
    /**
     * Detect path traversal vulnerabilities
     */
    private detectPathTraversal(
        code: string,
        vulnerabilities: SecurityVulnerability[],
        recommendations: string[]
    ): void {
        const pathTraversalPatterns = [
            {
                pattern: /readFile.*\+.*req\.(query|params|body)/g,
                description: 'File read with user input'
            },
            {
                pattern: /path\.join\([^)]*req\.(query|params|body)/g,
                description: 'Path join with user input'
            },
            {
                pattern: /\.\.\/.*req\.(query|params|body)/g,
                description: 'Relative path with user input'
            }
        ];
        
        for (const { pattern, description } of pathTraversalPatterns) {
            if (pattern.test(code)) {
                vulnerabilities.push({
                    type: 'path-traversal',
                    severity: 'high',
                    description: `Path traversal vulnerability: ${description}`,
                    location: {
                        pattern: pattern.source
                    },
                    cwe: 'CWE-22',
                    fix: 'Validate and sanitize file paths, use whitelist of allowed paths'
                });
                
                recommendations.push('Always validate file paths and restrict access to allowed directories');
            }
        }
    }
    
    /**
     * Detect command injection vulnerabilities
     */
    private detectCommandInjection(
        code: string,
        language: string,
        vulnerabilities: SecurityVulnerability[],
        recommendations: string[]
    ): void {
        const commandPatterns = [
            {
                pattern: /exec\s*\([^)]*\+/g,
                description: 'exec with concatenation'
            },
            {
                pattern: /spawn\s*\([^,)]*\+/g,
                description: 'spawn with concatenation'
            },
            {
                pattern: /system\s*\([^)]*\+/g,
                description: 'system call with concatenation'
            },
            {
                pattern: /shell\s*[:=]\s*true.*\+/g,
                description: 'Shell execution with user input'
            }
        ];
        
        for (const { pattern, description } of commandPatterns) {
            if (pattern.test(code)) {
                vulnerabilities.push({
                    type: 'command-injection',
                    severity: 'critical',
                    description: `Command injection vulnerability: ${description}`,
                    location: {
                        pattern: pattern.source
                    },
                    cwe: 'CWE-78',
                    fix: 'Use parameterized commands or avoid shell execution'
                });
                
                recommendations.push('Never concatenate user input into system commands');
            }
        }
        
        // Specific language patterns
        if (language === 'python' && code.includes('os.system')) {
            vulnerabilities.push({
                type: 'command-injection',
                severity: 'high',
                description: 'os.system usage (prone to command injection)',
                location: {
                    pattern: 'os.system'
                },
                cwe: 'CWE-78',
                fix: 'Use subprocess.run with list arguments instead'
            });
        }
    }
    
    /**
     * Calculate overall risk score
     */
    private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
        let score = 0;
        
        for (const vuln of vulnerabilities) {
            switch (vuln.severity) {
                case 'critical':
                    score += 25;
                    break;
                case 'high':
                    score += 15;
                    break;
                case 'medium':
                    score += 10;
                    break;
                case 'low':
                    score += 5;
                    break;
            }
        }
        
        return Math.min(100, score);
    }
}

// Export singleton instance
export const securityValidator = new SecurityValidator();