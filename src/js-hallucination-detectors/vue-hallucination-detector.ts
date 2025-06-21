/**
 * Detector de alucinações específico para Vue.js
 * Foca em composition API, diretivas e padrões comumente alucinados
 */

export interface VueHallucinationResult {
    valid: boolean;
    issues: VueHallucinationIssue[];
    score: number;
    suggestions: string[];
}

export interface VueHallucinationIssue {
    type: 'hallucinated-composable' | 'invalid-vue-api' | 'directive-violation' | 'deprecated-api' | 'anti-pattern';
    severity: 'error' | 'warning' | 'info';
    message: string;
    location: {
        line?: number;
        composable?: string;
        directive?: string;
        api?: string;
        context?: string;
    };
    suggestion: string;
}

// Composables válidos do Vue 3
const VALID_VUE_COMPOSABLES = new Set([
    'ref', 'reactive', 'computed', 'readonly', 'watchEffect', 'watch',
    'isRef', 'unref', 'toRef', 'toRefs', 'isReactive', 'isReadonly',
    'isProxy', 'shallowRef', 'triggerRef', 'customRef', 'shallowReactive',
    'shallowReadonly', 'toRaw', 'markRaw', 'effectScope', 'getCurrentScope',
    'onScopeDispose', 'onMounted', 'onUpdated', 'onUnmounted', 'onBeforeMount',
    'onBeforeUpdate', 'onBeforeUnmount', 'onErrorCaptured', 'onRenderTracked',
    'onRenderTriggered', 'onActivated', 'onDeactivated', 'onServerPrefetch',
    'provide', 'inject', 'hasInjectionContext', 'getCurrentInstance',
    'useSlots', 'useAttrs', 'useCssModule', 'useCssVars'
]);

// Composables comumente alucinados
const HALLUCINATED_COMPOSABLES = {
    // Async/Promise composables (não existem)
    'useAsync': {
        message: 'useAsync não é um composable nativo do Vue',
        suggestion: 'Use watchEffect com async function ou bibliotecas como VueUse'
    },
    'useFetch': {
        message: 'useFetch não é um composable nativo do Vue',
        suggestion: 'Use watchEffect com fetch ou bibliotecas como @vueuse/core'
    },
    'usePromise': {
        message: 'usePromise não é um composable nativo do Vue',
        suggestion: 'Use ref + watchEffect com Promise'
    },
    'useApi': {
        message: 'useApi não é um composable nativo do Vue',
        suggestion: 'Crie um composable personalizado ou use VueUse'
    },
    'useRequest': {
        message: 'useRequest não é um composable nativo do Vue',
        suggestion: 'Use bibliotecas como @tanstack/vue-query ou VueUse'
    },
    
    // State management composables (não existem)
    'useStore': {
        message: 'useStore não é um composable nativo do Vue',
        suggestion: 'Use provide/inject ou Pinia/Vuex'
    },
    'useGlobalState': {
        message: 'useGlobalState não é um composable nativo do Vue',
        suggestion: 'Use provide/inject ou state management library'
    },
    'useState': {
        message: 'useState não é um composable do Vue (é do React)',
        suggestion: 'Use ref() ou reactive() no Vue'
    },
    'useObservable': {
        message: 'useObservable não é um composable nativo do Vue',
        suggestion: 'Use watchEffect com reactive data'
    },
    
    // Effect composables (não existem)
    'useMount': {
        message: 'useMount não é um composable nativo do Vue',
        suggestion: 'Use onMounted()'
    },
    'useUnmount': {
        message: 'useUnmount não é um composable nativo do Vue',
        suggestion: 'Use onUnmounted()'
    },
    'useUpdate': {
        message: 'useUpdate não é um composable nativo do Vue',
        suggestion: 'Use onUpdated() ou watchEffect'
    },
    'useEffect': {
        message: 'useEffect não é um composable do Vue (é do React)',
        suggestion: 'Use watchEffect() ou watch() no Vue'
    },
    
    // Timer composables (não existem)
    'useInterval': {
        message: 'useInterval não é um composable nativo do Vue',
        suggestion: 'Crie composable personalizado com setInterval + onUnmounted'
    },
    'useTimeout': {
        message: 'useTimeout não é um composable nativo do Vue',
        suggestion: 'Crie composable personalizado com setTimeout + onUnmounted'
    },
    'useDebounce': {
        message: 'useDebounce não é um composable nativo do Vue',
        suggestion: 'Use @vueuse/core ou crie composable personalizado'
    },
    'useThrottle': {
        message: 'useThrottle não é um composable nativo do Vue',
        suggestion: 'Use @vueuse/core ou crie composable personalizado'
    }
};

// APIs Vue comumente alucinadas
const HALLUCINATED_VUE_APIS = {
    // HTTP/Fetch APIs (não existem no Vue)
    'Vue.fetch': {
        message: 'Vue.fetch não existe',
        suggestion: 'Use fetch() nativo ou bibliotecas como axios'
    },
    'Vue.ajax': {
        message: 'Vue.ajax não existe',
        suggestion: 'Use fetch() ou bibliotecas HTTP'
    },
    'Vue.http': {
        message: 'Vue.http foi removido do Vue 2+',
        suggestion: 'Use vue-resource, axios ou fetch()'
    },
    'Vue.request': {
        message: 'Vue.request não existe',
        suggestion: 'Use fetch() ou bibliotecas HTTP'
    },
    
    // State management APIs (não existem)
    'Vue.store': {
        message: 'Vue.store não existe',
        suggestion: 'Use Vuex ou Pinia'
    },
    'Vue.state': {
        message: 'Vue.state não existe',
        suggestion: 'Use data() em Options API ou reactive() em Composition API'
    },
    'Vue.globalState': {
        message: 'Vue.globalState não existe',
        suggestion: 'Use provide/inject ou state management libraries'
    },
    
    // Utility APIs (não existem)
    'Vue.utils': {
        message: 'Vue.utils não existe',
        suggestion: 'Use utilities específicas ou bibliotecas separadas'
    },
    'Vue.helpers': {
        message: 'Vue.helpers não existe',
        suggestion: 'Use funções utility específicas'
    },
    'Vue.validator': {
        message: 'Vue.validator não existe',
        suggestion: 'Use bibliotecas de validação como VeeValidate'
    }
};

// Diretivas válidas do Vue
const VALID_VUE_DIRECTIVES = new Set([
    'v-text', 'v-html', 'v-show', 'v-if', 'v-else', 'v-else-if', 'v-for',
    'v-on', 'v-bind', 'v-model', 'v-slot', 'v-pre', 'v-once', 'v-memo',
    'v-cloak'
]);

// Diretivas comumente alucinadas
const HALLUCINATED_DIRECTIVES = {
    'v-model-lazy': {
        message: 'v-model-lazy não existe. Use v-model.lazy',
        suggestion: 'Use v-model.lazy modifier'
    },
    'v-show-if': {
        message: 'v-show-if não existe',
        suggestion: 'Use v-show com expressão condicional'
    },
    'v-hide': {
        message: 'v-hide não existe',
        suggestion: 'Use v-show com expressão negada: v-show="!condition"'
    },
    'v-display': {
        message: 'v-display não existe',
        suggestion: 'Use v-show ou v-if'
    },
    'v-visible': {
        message: 'v-visible não existe',
        suggestion: 'Use v-show'
    },
    'v-repeat': {
        message: 'v-repeat não existe no Vue 2+',
        suggestion: 'Use v-for'
    },
    'v-each': {
        message: 'v-each não existe',
        suggestion: 'Use v-for'
    }
};

// APIs depreciadas do Vue
const DEPRECATED_VUE_APIS = {
    '$set': 'Use reactive() ou ref() no Vue 3',
    '$delete': 'Use delete operator ou reactive() no Vue 3',
    'Vue.set': 'Use reactive() no Vue 3',
    'Vue.delete': 'Use delete operator no Vue 3',
    'Vue.observable': 'Use reactive() no Vue 3',
    'beforeCreate': 'Use setup() no Vue 3 Composition API',
    'created': 'Use setup() no Vue 3 Composition API',
    'beforeDestroy': 'Use onBeforeUnmount() no Vue 3',
    'destroyed': 'Use onUnmounted() no Vue 3',
    'Vue.extend': 'Use defineComponent() no Vue 3',
    'Vue.component': 'Use app.component() no Vue 3',
    'Vue.directive': 'Use app.directive() no Vue 3',
    'Vue.mixin': 'Use app.mixin() no Vue 3',
    'Vue.use': 'Use app.use() no Vue 3'
};

export class VueHallucinationDetector {
    /**
     * Detectar alucinações em código Vue.js
     */
    async detectVueHallucinations(
        code: string,
        options: {
            vueVersion?: '2' | '3';
            compositionAPI?: boolean;
            typescript?: boolean;
            strictMode?: boolean;
        } = {}
    ): Promise<VueHallucinationResult> {
        const issues: VueHallucinationIssue[] = [];
        const suggestions: string[] = [];
        
        const { vueVersion = '3', compositionAPI = true } = options;
        
        // Detectar composables alucinados
        if (compositionAPI || vueVersion === '3') {
            this.detectHallucinatedComposables(code, issues, suggestions);
        }
        
        // Detectar APIs Vue alucinadas
        this.detectHallucinatedVueAPIs(code, issues, suggestions);
        
        // Detectar diretivas alucinadas
        this.detectHallucinatedDirectives(code, issues, suggestions);
        
        // Detectar APIs depreciadas
        this.detectDeprecatedAPIs(code, vueVersion, issues, suggestions);
        
        // Detectar anti-patterns
        this.detectAntiPatterns(code, vueVersion, issues, suggestions);
        
        // Calcular pontuação
        const score = this.calculateScore(issues);
        
        return {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            score,
            suggestions: [...new Set(suggestions)]
        };
    }
    
    /**
     * Detectar composables alucinados
     */
    private detectHallucinatedComposables(
        code: string,
        issues: VueHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Padrão para encontrar chamadas de composable
        const composablePattern = /\b(use[A-Z]\w*|ref|reactive|computed|watch\w*|on[A-Z]\w*)\s*\(/g;
        
        let match;
        while ((match = composablePattern.exec(code)) !== null) {
            const composableName = match[1];
            
            // Verificar se é um composable alucinado conhecido
            if (HALLUCINATED_COMPOSABLES[composableName as keyof typeof HALLUCINATED_COMPOSABLES]) {
                const composableInfo = HALLUCINATED_COMPOSABLES[composableName as keyof typeof HALLUCINATED_COMPOSABLES];
                
                issues.push({
                    type: 'hallucinated-composable',
                    severity: 'error',
                    message: composableInfo.message,
                    location: {
                        composable: composableName,
                        context: this.extractContext(code, match.index)
                    },
                    suggestion: composableInfo.suggestion
                });
                
                suggestions.push(composableInfo.suggestion);
            }
            // Verificar se segue convenções de composable mas não é válido
            else if (composableName.startsWith('use') && !VALID_VUE_COMPOSABLES.has(composableName)) {
                // Verificar se parece com composable alucinado comum
                const suspiciousPatterns = [
                    /use.*Api$/i, /use.*Fetch$/i, /use.*Request$/i, /use.*Async$/i,
                    /use.*Promise$/i, /use.*Store$/i, /use.*Global$/i, /use.*State$/i
                ];
                
                const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(composableName));
                
                if (isSuspicious) {
                    issues.push({
                        type: 'hallucinated-composable',
                        severity: 'warning',
                        message: `${composableName} parece ser um composable personalizado com padrão suspeito`,
                        location: {
                            composable: composableName
                        },
                        suggestion: 'Verifique se este composable existe ou implemente-o como composable personalizado'
                    });
                }
            }
        }
    }
    
    /**
     * Detectar APIs Vue alucinadas
     */
    private detectHallucinatedVueAPIs(
        code: string,
        issues: VueHallucinationIssue[],
        suggestions: string[]
    ): void {
        for (const [api, info] of Object.entries(HALLUCINATED_VUE_APIS)) {
            if (code.includes(api)) {
                issues.push({
                    type: 'invalid-vue-api',
                    severity: 'error',
                    message: info.message,
                    location: {
                        api
                    },
                    suggestion: info.suggestion
                });
                
                suggestions.push(info.suggestion);
            }
        }
        
        // Detectar padrões gerais de APIs alucinadas
        const vueApiPattern = /Vue\.(\w+)/g;
        const validVueAPIs = new Set([
            'createApp', 'defineComponent', 'defineAsyncComponent', 'defineCustomElement',
            'h', 'Fragment', 'Text', 'Comment', 'Static', 'Teleport', 'Suspense',
            'KeepAlive', 'BaseTransition', 'Transition', 'TransitionGroup',
            'ref', 'reactive', 'readonly', 'computed', 'watch', 'watchEffect',
            'isRef', 'unref', 'toRef', 'toRefs', 'isReactive', 'isReadonly',
            'isProxy', 'shallowRef', 'triggerRef', 'customRef', 'shallowReactive',
            'shallowReadonly', 'toRaw', 'markRaw', 'nextTick', 'version'
        ]);
        
        let match;
        while ((match = vueApiPattern.exec(code)) !== null) {
            const apiName = match[1];
            
            if (!validVueAPIs.has(apiName)) {
                issues.push({
                    type: 'invalid-vue-api',
                    severity: 'error',
                    message: `Vue.${apiName} não é uma API válida do Vue`,
                    location: {
                        api: `Vue.${apiName}`
                    },
                    suggestion: `APIs válidas do Vue: ${Array.from(validVueAPIs).join(', ')}`
                });
            }
        }
    }
    
    /**
     * Detectar diretivas alucinadas
     */
    private detectHallucinatedDirectives(
        code: string,
        issues: VueHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Padrão para encontrar diretivas
        const directivePattern = /v-([a-zA-Z-]+)/g;
        
        let match;
        while ((match = directivePattern.exec(code)) !== null) {
            const directiveName = `v-${match[1]}`;
            
            // Verificar se é uma diretiva alucinada conhecida
            if (HALLUCINATED_DIRECTIVES[directiveName as keyof typeof HALLUCINATED_DIRECTIVES]) {
                const directiveInfo = HALLUCINATED_DIRECTIVES[directiveName as keyof typeof HALLUCINATED_DIRECTIVES];
                
                issues.push({
                    type: 'directive-violation',
                    severity: 'error',
                    message: directiveInfo.message,
                    location: {
                        directive: directiveName,
                        context: this.extractContext(code, match.index)
                    },
                    suggestion: directiveInfo.suggestion
                });
                
                suggestions.push(directiveInfo.suggestion);
            }
            // Verificar se é uma diretiva válida
            else if (!VALID_VUE_DIRECTIVES.has(directiveName) && !directiveName.startsWith('v-on:') && !directiveName.startsWith('v-bind:')) {
                issues.push({
                    type: 'directive-violation',
                    severity: 'warning',
                    message: `${directiveName} não é uma diretiva padrão do Vue`,
                    location: {
                        directive: directiveName
                    },
                    suggestion: 'Verifique se é uma diretiva personalizada ou se o nome está correto'
                });
            }
        }
    }
    
    /**
     * Detectar APIs depreciadas
     */
    private detectDeprecatedAPIs(
        code: string,
        vueVersion: string,
        issues: VueHallucinationIssue[],
        suggestions: string[]
    ): void {
        if (vueVersion === '3') {
            for (const [api, suggestion] of Object.entries(DEPRECATED_VUE_APIS)) {
                if (code.includes(api)) {
                    issues.push({
                        type: 'deprecated-api',
                        severity: 'warning',
                        message: `${api} está depreciado no Vue 3`,
                        location: {
                            api
                        },
                        suggestion
                    });
                    
                    suggestions.push(suggestion);
                }
            }
        }
        
        // Verificar filtros (removidos no Vue 3)
        if (vueVersion === '3' && code.includes('|')) {
            const filterPattern = /\|\s*\w+/g;
            if (filterPattern.test(code)) {
                issues.push({
                    type: 'deprecated-api',
                    severity: 'error',
                    message: 'Filtros foram removidos no Vue 3',
                    location: {
                        api: 'filters'
                    },
                    suggestion: 'Use computed properties ou métodos em vez de filtros'
                });
            }
        }
    }
    
    /**
     * Detectar anti-patterns
     */
    private detectAntiPatterns(
        code: string,
        vueVersion: string,
        issues: VueHallucinationIssue[],
        suggestions: string[]
    ): void {
        // Mutação direta de reactive state
        if (code.includes('reactive') && (code.includes('.push(') || code.includes('.pop('))) {
            issues.push({
                type: 'anti-pattern',
                severity: 'warning',
                message: 'Possível mutação direta de reactive state',
                location: {
                    context: 'Reactive state mutation'
                },
                suggestion: 'Reactive state pode ser mutado diretamente, mas considere usar ref() para primitivos'
            });
        }
        
        // watch sem cleanup
        const watchPattern = /watch\s*\(\s*[^,)]+\s*,\s*[^,)]+\s*\)/g;
        if (watchPattern.test(code)) {
            issues.push({
                type: 'anti-pattern',
                severity: 'info',
                message: 'watch sem cleanup pode causar memory leaks',
                location: {
                    context: 'watch without cleanup'
                },
                suggestion: 'Considere retornar cleanup function ou usar watchEffect'
            });
        }
        
        // Composables fora de setup()
        if (code.includes('ref(') || code.includes('reactive(')) {
            const setupPattern = /setup\s*\(/;
            const scriptSetupPattern = /<script\s+setup>/;
            
            if (!setupPattern.test(code) && !scriptSetupPattern.test(code)) {
                issues.push({
                    type: 'anti-pattern',
                    severity: 'warning',
                    message: 'Composables devem ser usados dentro de setup() ou <script setup>',
                    location: {
                        context: 'Composables outside setup'
                    },
                    suggestion: 'Mova composables para dentro de setup() ou use <script setup>'
                });
            }
        }
        
        // v-for sem key
        const vForPattern = /v-for[^>]*>/g;
        let match;
        while ((match = vForPattern.exec(code)) !== null) {
            const vForBlock = match[0];
            if (!vForBlock.includes(':key') && !vForBlock.includes('v-bind:key')) {
                issues.push({
                    type: 'anti-pattern',
                    severity: 'warning',
                    message: 'v-for sem :key pode causar problemas de renderização',
                    location: {
                        context: 'v-for without key'
                    },
                    suggestion: 'Sempre adicione :key único em v-for'
                });
            }
        }
    }
    
    /**
     * Extrair contexto ao redor de uma posição
     */
    private extractContext(code: string, position: number): string {
        const lines = code.split('\n');
        let currentPos = 0;
        
        for (let i = 0; i < lines.length; i++) {
            if (currentPos + lines[i].length >= position) {
                return lines[i].trim();
            }
            currentPos += lines[i].length + 1;
        }
        
        return '';
    }
    
    /**
     * Calcular pontuação
     */
    private calculateScore(issues: VueHallucinationIssue[]): number {
        let score = 100;
        
        for (const issue of issues) {
            switch (issue.severity) {
                case 'error':
                    score -= 25;
                    break;
                case 'warning':
                    score -= 15;
                    break;
                case 'info':
                    score -= 5;
                    break;
            }
        }
        
        return Math.max(0, score);
    }
}

// Export singleton
export const vueHallucinationDetector = new VueHallucinationDetector();