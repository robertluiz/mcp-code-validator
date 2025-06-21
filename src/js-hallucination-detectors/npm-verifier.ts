/**
 * Verificador de pacotes NPM para detectar alucinações
 * Foca especificamente no ecossistema JavaScript/TypeScript
 */

import fetch from 'node-fetch';

export interface NpmPackageInfo {
    name: string;
    exists: boolean;
    version?: string;
    metadata?: {
        description: string;
        weeklyDownloads: number;
        lastPublish: Date;
        maintainers: string[];
        deprecated: boolean;
        homepage?: string;
    };
    security: {
        isPopular: boolean;
        isSuspicious: boolean;
        hasVulnerabilities: boolean;
        riskScore: number; // 0-100
    };
    alternatives?: string[];
}

export interface NpmVerificationResult {
    packages: NpmPackageInfo[];
    summary: {
        total: number;
        existing: number;
        hallucinated: number;
        suspicious: number;
    };
    recommendations: string[];
}

// Padrões comuns de pacotes alucinados
const HALLUCINATED_PATTERNS = [
    /^(magic|auto|smart|ai|ml|super|mega|ultra)-/i,
    /-(helper|utils|tool|manager|handler|magic|auto)$/i,
    /^(universal|automatic|intelligent|dynamic|advanced)-/i,
];

// Typos comuns de pacotes populares
const COMMON_TYPOS: Record<string, string> = {
    'expres': 'express',
    'mongose': 'mongoose', 
    'lodassh': 'lodash',
    'requst': 'request',
    'moment-js': 'moment',
    'angular-cli': '@angular/cli',
    'react-native-cli': 'react-native',
    'nextjs': 'next',
    'vuejs': 'vue',
    'nodejs': 'node', // não é um pacote
    'typescripts': 'typescript',
    'expresss': 'express',
    'axois': 'axios',
    'jqeury': 'jquery',
    'bootstraps': 'bootstrap',
    'materialui': '@mui/material',
    'antdesign': 'antd',
    'reactrouter': 'react-router',
    'reduxjs': '@reduxjs/toolkit',
    'styled-component': 'styled-components',
    'emotionjs': '@emotion/react'
};

// Pacotes que definitivamente não existem (comumente alucinados)
const DEFINITELY_HALLUCINATED = new Set([
    'magic-sdk',
    'auto-validator', 
    'smart-parser',
    'ai-helper',
    'universal-connector',
    'super-utils',
    'mega-tool',
    'ultra-helper',
    'advanced-parser',
    'intelligent-handler',
    'dynamic-loader',
    'automatic-validator',
    'magic-http',
    'smart-fetch',
    'auto-api',
    'ai-request',
    'magic-database',
    'smart-orm',
    'auto-migration',
    'ai-query',
    'huggingface-cli', // Existe mas com nome diferente
    'openai-api', // Nome incorreto
    'chatgpt-sdk', // Nome incorreto
]);

export class NpmVerifier {
    private cache = new Map<string, NpmPackageInfo>();
    private popularPackages = new Set<string>();
    
    constructor() {
        // Inicializar com pacotes populares conhecidos
        this.initializePopularPackages();
    }
    
    /**
     * Verificar múltiplos pacotes npm
     */
    async verifyPackages(packageNames: string[]): Promise<NpmVerificationResult> {
        const packages: NpmPackageInfo[] = [];
        const recommendations: string[] = [];
        
        for (const packageName of packageNames) {
            const packageInfo = await this.verifyPackage(packageName);
            packages.push(packageInfo);
            
            if (!packageInfo.exists && packageInfo.alternatives?.length) {
                recommendations.push(
                    `'${packageName}' não existe. Talvez você quis dizer: ${packageInfo.alternatives.join(', ')}`
                );
            }
            
            if (packageInfo.security.isSuspicious) {
                recommendations.push(
                    `'${packageName}' tem padrão suspeito de alucinação. Verifique se é realmente necessário.`
                );
            }
        }
        
        const summary = {
            total: packages.length,
            existing: packages.filter(p => p.exists).length,
            hallucinated: packages.filter(p => !p.exists).length,
            suspicious: packages.filter(p => p.security.isSuspicious).length
        };
        
        return { packages, summary, recommendations };
    }
    
    /**
     * Verificar um pacote específico
     */
    async verifyPackage(packageName: string): Promise<NpmPackageInfo> {
        // Verificar cache primeiro
        if (this.cache.has(packageName)) {
            return this.cache.get(packageName)!;
        }
        
        // Verificar se é definitivamente alucinado
        if (DEFINITELY_HALLUCINATED.has(packageName)) {
            const result: NpmPackageInfo = {
                name: packageName,
                exists: false,
                security: {
                    isPopular: false,
                    isSuspicious: true,
                    hasVulnerabilities: false,
                    riskScore: 90
                },
                alternatives: this.findAlternatives(packageName)
            };
            
            this.cache.set(packageName, result);
            return result;
        }
        
        try {
            // Consultar npm registry
            const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
            const response = await fetch(registryUrl);
            
            if (!response.ok) {
                // Pacote não existe
                return this.handleNonExistentPackage(packageName);
            }
            
            const data = await response.json() as any;
            
            // Buscar dados de downloads
            const downloadsData = await this.getDownloadStats(packageName);
            
            const packageInfo: NpmPackageInfo = {
                name: packageName,
                exists: true,
                version: data['dist-tags']?.latest,
                metadata: {
                    description: data.description || '',
                    weeklyDownloads: downloadsData.downloads,
                    lastPublish: new Date(data.time?.modified || data.time?.created),
                    maintainers: data.maintainers?.map((m: any) => m.name) || [],
                    deprecated: !!data.deprecated,
                    homepage: data.homepage
                },
                security: this.assessSecurity(packageName, data, downloadsData.downloads)
            };
            
            this.cache.set(packageName, packageInfo);
            return packageInfo;
            
        } catch (error) {
            console.error(`Erro ao verificar pacote ${packageName}:`, error);
            return this.handleNonExistentPackage(packageName);
        }
    }
    
    /**
     * Lidar com pacote que não existe
     */
    private handleNonExistentPackage(packageName: string): NpmPackageInfo {
        const alternatives = this.findAlternatives(packageName);
        const isSuspicious = this.isSuspiciousName(packageName);
        
        const result: NpmPackageInfo = {
            name: packageName,
            exists: false,
            security: {
                isPopular: false,
                isSuspicious,
                hasVulnerabilities: false,
                riskScore: isSuspicious ? 80 : 40
            },
            alternatives
        };
        
        this.cache.set(packageName, result);
        return result;
    }
    
    /**
     * Obter estatísticas de download
     */
    private async getDownloadStats(packageName: string): Promise<{downloads: number}> {
        try {
            const downloadsUrl = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`;
            const response = await fetch(downloadsUrl);
            
            if (response.ok) {
                const data = await response.json() as any;
                return { downloads: data.downloads || 0 };
            }
        } catch (error) {
            // Ignorar erros de download stats
        }
        
        return { downloads: 0 };
    }
    
    /**
     * Avaliar segurança do pacote
     */
    private assessSecurity(packageName: string, data: any, downloads: number): NpmPackageInfo['security'] {
        let riskScore = 0;
        
        // Verificar se é popular
        const isPopular = downloads > 1000 || this.popularPackages.has(packageName);
        
        // Verificar padrões suspeitos
        const isSuspicious = this.isSuspiciousName(packageName);
        
        if (isSuspicious) riskScore += 30;
        if (!isPopular && downloads < 100) riskScore += 20;
        if (data.deprecated) riskScore += 25;
        if (!data.maintainers || data.maintainers.length === 0) riskScore += 15;
        
        // Verificar idade do pacote
        const created = new Date(data.time?.created);
        const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) riskScore += 20; // Pacote muito novo
        
        return {
            isPopular,
            isSuspicious,
            hasVulnerabilities: false, // TODO: Integrar com npm audit
            riskScore: Math.min(100, riskScore)
        };
    }
    
    /**
     * Verificar se o nome é suspeito
     */
    private isSuspiciousName(packageName: string): boolean {
        return HALLUCINATED_PATTERNS.some(pattern => pattern.test(packageName));
    }
    
    /**
     * Encontrar alternativas para pacotes inexistentes
     */
    private findAlternatives(packageName: string): string[] {
        const alternatives: string[] = [];
        
        // Verificar typos comuns
        if (COMMON_TYPOS[packageName]) {
            alternatives.push(COMMON_TYPOS[packageName]);
        }
        
        // Sugestões baseadas em padrões
        const suggestions = this.getSuggestionsByPattern(packageName);
        alternatives.push(...suggestions);
        
        return [...new Set(alternatives)]; // Remove duplicatas
    }
    
    /**
     * Obter sugestões baseadas em padrões
     */
    private getSuggestionsByPattern(packageName: string): string[] {
        const suggestions: string[] = [];
        
        // Padrões de substituição
        const patterns = [
            // HTTP/Ajax
            { test: /http|ajax|fetch|request/i, suggest: ['axios', 'node-fetch', 'got', 'superagent'] },
            // Utilities
            { test: /util|helper|tool/i, suggest: ['lodash', 'ramda', 'underscore'] },
            // Database
            { test: /database|db|orm/i, suggest: ['mongoose', 'sequelize', 'typeorm', 'prisma'] },
            // Validation
            { test: /valid|check|schema/i, suggest: ['joi', 'yup', 'ajv', 'zod'] },
            // Testing
            { test: /test|mock|stub/i, suggest: ['jest', 'mocha', 'sinon', 'vitest'] },
            // Date/Time
            { test: /date|time|moment/i, suggest: ['moment', 'dayjs', 'date-fns'] },
            // Crypto
            { test: /crypto|hash|encrypt/i, suggest: ['crypto-js', 'bcrypt', 'jsonwebtoken'] },
            // File system
            { test: /file|fs|path/i, suggest: ['fs-extra', 'glob', 'rimraf'] },
            // React
            { test: /react.*hook|react.*state/i, suggest: ['react', '@reduxjs/toolkit', 'zustand'] },
            // Vue
            { test: /vue.*composit|vue.*reactive/i, suggest: ['vue', '@vue/composition-api', 'pinia'] }
        ];
        
        for (const pattern of patterns) {
            if (pattern.test.test(packageName)) {
                suggestions.push(...pattern.suggest);
            }
        }
        
        return suggestions;
    }
    
    /**
     * Inicializar lista de pacotes populares
     */
    private initializePopularPackages(): void {
        const popular = [
            // Core
            'react', 'vue', 'angular', 'typescript', 'lodash', 'moment', 'axios',
            // Build tools
            'webpack', 'vite', 'rollup', 'babel', 'eslint', 'prettier',
            // Testing
            'jest', 'mocha', 'cypress', 'playwright', 'vitest',
            // State management
            '@reduxjs/toolkit', 'redux', 'mobx', 'zustand', 'pinia',
            // Styling
            'styled-components', '@emotion/react', 'sass', 'tailwindcss',
            // Node.js
            'express', 'fastify', 'koa', 'nest', 'next',
            // Database
            'mongoose', 'sequelize', 'typeorm', 'prisma',
            // Utilities
            'ramda', 'underscore', 'chalk', 'commander', 'inquirer',
            // Validation
            'joi', 'yup', 'ajv', 'zod',
            // Date/Time
            'dayjs', 'date-fns',
            // HTTP clients
            'node-fetch', 'got', 'superagent',
            // File system
            'fs-extra', 'glob', 'rimraf', 'chokidar'
        ];
        
        popular.forEach(pkg => this.popularPackages.add(pkg));
    }
}

// Export singleton
export const npmVerifier = new NpmVerifier();