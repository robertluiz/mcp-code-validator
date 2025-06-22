/**
 * Tests for Tailwind CSS Validator
 */

import { TailwindValidator } from '../src/validators/tailwind-validator';

describe('TailwindValidator', () => {
    let validator: TailwindValidator;

    beforeEach(() => {
        validator = new TailwindValidator();
    });

    describe('Basic Tailwind class validation', () => {
        test('should validate common utility classes', () => {
            const result = validator.validateTailwindClasses('text-center bg-blue-500 p-4 m-2');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.metrics.totalClasses).toBe(4);
            expect(result.metrics.validClasses).toBe(4);
            expect(result.metrics.invalidClasses).toBe(0);
        });

        test('should detect invalid classes', () => {
            const result = validator.validateTailwindClasses('invalid-class unknown-utility');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.metrics.invalidClasses).toBeGreaterThan(0);
        });

        test('should handle empty input', () => {
            const result = validator.validateTailwindClasses('');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.metrics.totalClasses).toBe(0);
        });
    });

    describe('Responsive classes validation', () => {
        test('should validate responsive prefixes', () => {
            const result = validator.validateTailwindClasses('sm:text-lg md:text-xl lg:text-2xl');
            
            expect(result.isValid).toBe(true);
            expect(result.metrics.responsiveClasses).toBe(3);
            expect(result.errors).toHaveLength(0);
        });

        test('should detect invalid responsive classes', () => {
            const result = validator.validateTailwindClasses('sm:invalid-class md:unknown-utility');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('State modifier validation', () => {
        test('should validate state modifiers', () => {
            const result = validator.validateTailwindClasses('hover:bg-blue-600 focus:ring-2 active:scale-95');
            
            expect(result.isValid).toBe(true);
            expect(result.metrics.stateClasses).toBe(3);
            expect(result.errors).toHaveLength(0);
        });

        test('should validate group and peer modifiers', () => {
            const result = validator.validateTailwindClasses('group-hover:opacity-100 peer-focus:text-blue-500');
            
            expect(result.isValid).toBe(true);
            expect(result.metrics.stateClasses).toBe(2);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Arbitrary value validation', () => {
        test('should validate basic arbitrary values', () => {
            const result = validator.validateTailwindClasses('w-[100px] h-[200px] bg-[#ff0000]');
            
            expect(result.isValid).toBe(true);
            expect(result.metrics.arbitraryValues).toBe(3);
            expect(result.errors).toHaveLength(0);
        });

        test('should detect invalid arbitrary value syntax', () => {
            const result = validator.validateTailwindClasses('w-[invalid bg-[unclosed text-[');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should validate complex arbitrary values', () => {
            const result = validator.validateTailwindClasses('grid-cols-[1fr_200px_1fr] bg-[url("/images/hero.jpg")]');
            
            expect(result.isValid).toBe(true);
            expect(result.metrics.arbitraryValues).toBe(2);
        });
    });

    describe('Deprecated class detection', () => {
        test('should detect deprecated classes', () => {
            const result = validator.validateTailwindClasses('transform filter backdrop-filter');
            
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.metrics.deprecatedClasses).toBeGreaterThan(0);
            
            const deprecatedWarnings = result.warnings.filter(w => w.type === 'deprecated');
            expect(deprecatedWarnings.length).toBeGreaterThan(0);
        });

        test('should suggest alternatives for deprecated classes', () => {
            const result = validator.validateTailwindClasses('whitespace-no-wrap overflow-ellipsis');
            
            expect(result.warnings.length).toBeGreaterThan(0);
            const messages = result.warnings.map(w => w.message);
            expect(messages.some(m => m.includes('whitespace-nowrap'))).toBe(true);
            expect(messages.some(m => m.includes('text-ellipsis'))).toBe(true);
        });
    });

    describe('Duplicate class detection', () => {
        test('should detect duplicate classes', () => {
            const result = validator.validateTailwindClasses('text-center text-center bg-blue-500 bg-blue-500');
            
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.metrics.duplicateClasses).toBeGreaterThan(0);
            
            const duplicateWarnings = result.warnings.filter(w => w.type === 'redundant');
            expect(duplicateWarnings.length).toBeGreaterThan(0);
        });
    });

    describe('Accessibility warnings', () => {
        test('should warn about small text sizes', () => {
            const result = validator.validateTailwindClasses('text-xs text-gray-200 bg-gray-800');
            
            const accessibilityWarnings = result.warnings.filter(w => w.type === 'accessibility');
            expect(accessibilityWarnings.length).toBeGreaterThan(0);
        });

        test('should warn about low opacity text', () => {
            const result = validator.validateTailwindClasses('text-blue-500 opacity-20');
            
            const accessibilityWarnings = result.warnings.filter(w => w.type === 'accessibility');
            expect(accessibilityWarnings.length).toBeGreaterThan(0);
        });
    });

    describe('Performance warnings', () => {
        test('should warn about excessive number of classes', () => {
            const manyClasses = Array.from({ length: 25 }, (_, i) => `class-${i}`).join(' ');
            const result = validator.validateTailwindClasses(manyClasses);
            
            const performanceWarnings = result.warnings.filter(w => w.type === 'performance');
            expect(performanceWarnings.length).toBeGreaterThan(0);
        });

        test('should warn about excessive arbitrary values', () => {
            const manyArbitrary = Array.from({ length: 8 }, (_, i) => `w-[${i * 10}px]`).join(' ');
            const result = validator.validateTailwindClasses(manyArbitrary);
            
            const maintainabilityWarnings = result.warnings.filter(w => w.type === 'maintainability');
            expect(maintainabilityWarnings.length).toBeGreaterThan(0);
        });
    });

    describe('Score calculation', () => {
        test('should give perfect score for valid classes', () => {
            const result = validator.validateTailwindClasses('text-center bg-blue-500 p-4');
            
            expect(result.score).toBe(100);
        });

        test('should reduce score for errors and warnings', () => {
            const result = validator.validateTailwindClasses('invalid-class text-xs text-xs');
            
            expect(result.score).toBeLessThan(100);
        });

        test('should never give negative score', () => {
            const result = validator.validateTailwindClasses('invalid1 invalid2 invalid3 invalid4 invalid5');
            
            expect(result.score).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Complex class combinations', () => {
        test('should validate complex real-world examples', () => {
            const complexClasses = 'flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 sm:p-6 lg:p-8';
            const result = validator.validateTailwindClasses(complexClasses);
            
            expect(result.isValid).toBe(true);
            expect(result.metrics.responsiveClasses).toBeGreaterThan(0);
            expect(result.metrics.stateClasses).toBeGreaterThan(0);
        });

        test('should handle mixed valid and invalid classes', () => {
            const mixedClasses = 'flex items-center invalid-class bg-blue-500 unknown-utility p-4';
            const result = validator.validateTailwindClasses(mixedClasses);
            
            expect(result.isValid).toBe(false);
            expect(result.metrics.validClasses).toBeGreaterThan(0);
            expect(result.metrics.invalidClasses).toBeGreaterThan(0);
        });
    });

    describe('Static utility methods', () => {
        test('should extract Tailwind classes from HTML', () => {
            const html = '<div class="flex items-center"><span className="text-blue-500">Test</span></div>';
            const classes = TailwindValidator.extractTailwindClasses(html);
            
            expect(classes).toContain('flex');
            expect(classes).toContain('items-center');
            expect(classes).toContain('text-blue-500');
        });

        test('should validate single class statically', () => {
            expect(TailwindValidator.isValidTailwindClass('text-center')).toBe(true);
            expect(TailwindValidator.isValidTailwindClass('invalid-class')).toBe(false);
        });

        test('should return deprecated classes map', () => {
            const deprecatedClasses = TailwindValidator.getDeprecatedClasses();
            
            expect(deprecatedClasses.size).toBeGreaterThan(0);
            expect(deprecatedClasses.has('transform')).toBe(true);
            expect(deprecatedClasses.has('filter')).toBe(true);
        });
    });

    describe('Edge cases', () => {
        test('should handle malformed input gracefully', () => {
            const result = validator.validateTailwindClasses('   \n\t  ');
            
            expect(result.isValid).toBe(true);
            expect(result.metrics.totalClasses).toBe(0);
        });

        test('should handle classes with special characters', () => {
            const result = validator.validateTailwindClasses('class-with-underscores_and-dashes');
            
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should handle very long class names', () => {
            const longClassName = 'a'.repeat(100);
            const result = validator.validateTailwindClasses(longClassName);
            
            expect(result.metrics.customClasses).toBeGreaterThan(0);
        });
    });

    describe('Validation context', () => {
        test('should include file path in validation results', () => {
            const result = validator.validateTailwindClasses('text-center', 'components/Button.jsx');
            
            expect(result.isValid).toBe(true);
            // File path should be used for context but doesn't affect validation outcome
        });

        test('should handle line numbers correctly', () => {
            const result = validator.validateTailwindClasses('invalid-class', '', 42);
            
            expect(result.errors[0].line).toBe(42);
        });
    });
});