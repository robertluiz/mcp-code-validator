/**
 * CSS Validator
 * Validates CSS syntax, properties, and coherence
 */

export interface CSSValidationResult {
  isValid: boolean;
  errors: CSSValidationError[];
  warnings: CSSValidationWarning[];
  suggestions: string[];
  score: number; // 0-100
  metrics: CSSMetrics;
}

export interface CSSValidationError {
  type: 'syntax' | 'property' | 'value' | 'selector' | 'performance' | 'accessibility';
  message: string;
  selector?: string;
  property?: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

export interface CSSValidationWarning {
  type: 'performance' | 'accessibility' | 'maintainability' | 'browser-support';
  message: string;
  selector?: string;
  property?: string;
  line: number;
  column: number;
}

export interface CSSMetrics {
  totalRules: number;
  totalDeclarations: number;
  specificity: SpecificityMetrics;
  performance: PerformanceMetrics;
  maintainability: MaintainabilityMetrics;
}

export interface SpecificityMetrics {
  average: number;
  max: number;
  distribution: Record<string, number>;
}

export interface PerformanceMetrics {
  expensiveSelectors: number;
  redundantDeclarations: number;
  unusedPrefixes: number;
}

export interface MaintainabilityMetrics {
  duplicateRules: number;
  magicNumbers: number;
  hardcodedColors: number;
}

// Valid CSS properties (subset of most common ones)
const VALID_CSS_PROPERTIES = new Set([
  // Layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-style', 'border-color', 'border-radius',
  'box-sizing', 'overflow', 'overflow-x', 'overflow-y', 'visibility', 'clip',
  'z-index',

  // Flexbox
  'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'justify-content',
  'align-items', 'align-content', 'order', 'flex-grow', 'flex-shrink', 'flex-basis',
  'align-self', 'gap', 'row-gap', 'column-gap',

  // Grid
  'grid', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas',
  'grid-template', 'grid-column-gap', 'grid-row-gap', 'grid-gap', 'grid-column',
  'grid-row', 'grid-area', 'justify-items', 'align-items', 'place-items',

  // Typography
  'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-decoration',
  'text-transform', 'text-indent', 'text-shadow', 'white-space', 'word-wrap',
  'word-break', 'color',

  // Background
  'background', 'background-color', 'background-image', 'background-repeat',
  'background-position', 'background-size', 'background-attachment', 'background-clip',
  'background-origin',

  // Visual effects
  'opacity', 'box-shadow', 'filter', 'transform', 'transform-origin',
  'transition', 'transition-property', 'transition-duration', 'transition-timing-function',
  'transition-delay', 'animation', 'animation-name', 'animation-duration',
  'animation-timing-function', 'animation-delay', 'animation-iteration-count',
  'animation-direction', 'animation-fill-mode', 'animation-play-state',

  // Table
  'table-layout', 'border-collapse', 'border-spacing', 'caption-side', 'empty-cells',

  // Lists
  'list-style', 'list-style-type', 'list-style-position', 'list-style-image',

  // Misc
  'cursor', 'outline', 'outline-width', 'outline-style', 'outline-color',
  'resize', 'user-select', 'pointer-events', 'content', 'quotes', 'counter-reset',
  'counter-increment'
]);

// Expensive CSS selectors that can cause performance issues
const EXPENSIVE_SELECTORS = [
  /\*.*\*/,           // Universal with descendant
  /\[.*\].*\[.*\]/,   // Multiple attribute selectors
  /:nth-child\(\w+\)/,// Complex nth-child
  /\w+\s+\w+\s+\w+\s+\w+/, // Deep descendant selectors (4+ levels)
];

// CSS units
const VALID_LENGTH_UNITS = new Set([
  'px', 'em', 'rem', 'ex', 'ch', 'vw', 'vh', 'vmin', 'vmax', '%',
  'cm', 'mm', 'in', 'pt', 'pc', 'fr'
]);

const VALID_TIME_UNITS = new Set(['s', 'ms']);
const VALID_ANGLE_UNITS = new Set(['deg', 'grad', 'rad', 'turn']);

// Browser prefixes
const VENDOR_PREFIXES = ['-webkit-', '-moz-', '-ms-', '-o-'];

export class CSSValidator {
  private errors: CSSValidationError[] = [];
  private warnings: CSSValidationWarning[] = [];
  private suggestions: string[] = [];
  private metrics: CSSMetrics = {
    totalRules: 0,
    totalDeclarations: 0,
    specificity: { average: 0, max: 0, distribution: {} },
    performance: { expensiveSelectors: 0, redundantDeclarations: 0, unusedPrefixes: 0 },
    maintainability: { duplicateRules: 0, magicNumbers: 0, hardcodedColors: 0 }
  };

  validateCSS(css: string, isStyled: boolean = false): CSSValidationResult {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
    this.resetMetrics();

    try {
      const rules = this.parseCSS(css, isStyled);
      
      for (const rule of rules) {
        this.validateRule(rule);
      }

      this.analyzeMetrics(rules);
      this.checkPerformance(rules);
      this.checkMaintainability(rules);

      const score = this.calculateScore();

      return {
        isValid: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions,
        score,
        metrics: this.metrics
      };
    } catch (error) {
      this.errors.push({
        type: 'syntax',
        message: `CSS parsing error: ${error}`,
        line: 1,
        column: 1,
        severity: 'error'
      });

      return {
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions,
        score: 0,
        metrics: this.metrics
      };
    }
  }

  private parseCSS(css: string, isStyled: boolean): CSSRule[] {
    const rules: CSSRule[] = [];
    const lines = css.split('\n');
    
    // Simple CSS parser - in production, use a proper CSS parser like postcss
    if (isStyled) {
      // Handle styled-components template literals
      css = this.extractStyledCSS(css);
    }

    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;
    let ruleIndex = 0;

    while ((match = ruleRegex.exec(css)) !== null) {
      const [fullMatch, selector, declarations] = match;
      const lineNumber = css.substring(0, match.index).split('\n').length;
      
      const rule: CSSRule = {
        selector: selector.trim(),
        declarations: this.parseDeclarations(declarations, lineNumber),
        line: lineNumber,
        specificity: this.calculateSpecificity(selector.trim())
      };
      
      rules.push(rule);
      ruleIndex++;
    }

    this.metrics.totalRules = rules.length;
    this.metrics.totalDeclarations = rules.reduce((sum, rule) => sum + rule.declarations.length, 0);

    return rules;
  }

  private extractStyledCSS(styledCode: string): string {
    // Extract CSS from styled-components template literals
    const templateRegex = /`([^`]+)`/g;
    let css = '';
    let match;

    while ((match = templateRegex.exec(styledCode)) !== null) {
      let cssContent = match[1];
      // Remove template literal interpolations for parsing
      cssContent = cssContent.replace(/\$\{[^}]+\}/g, 'var(--placeholder)');
      css += cssContent + '\n';
    }

    return css || styledCode;
  }

  private parseDeclarations(declarationsText: string, startLine: number): CSSDeclaration[] {
    const declarations: CSSDeclaration[] = [];
    const lines = declarationsText.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) return;

      const property = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).replace(';', '').trim();

      declarations.push({
        property,
        value,
        line: startLine + index,
        column: line.indexOf(property) + 1
      });
    });

    return declarations;
  }

  private validateRule(rule: CSSRule): void {
    // Validate selector
    this.validateSelector(rule);
    
    // Validate each declaration
    for (const declaration of rule.declarations) {
      this.validateDeclaration(declaration);
    }
  }

  private validateSelector(rule: CSSRule): void {
    const { selector, line } = rule;

    // Check for expensive selectors
    for (const pattern of EXPENSIVE_SELECTORS) {
      if (pattern.test(selector)) {
        this.warnings.push({
          type: 'performance',
          message: 'Selector may cause performance issues',
          selector,
          line,
          column: 1
        });
        this.metrics.performance.expensiveSelectors++;
        break;
      }
    }

    // Check selector specificity
    if (rule.specificity > 100) {
      this.warnings.push({
        type: 'maintainability',
        message: 'High specificity selector may be hard to override',
        selector,
        line,
        column: 1
      });
    }

    // Check for ID selectors (high specificity)
    if (selector.includes('#') && !selector.startsWith('@')) {
      this.suggestions.push(`Consider using classes instead of IDs for styling at line ${line}`);
    }

    // Check for overly specific selectors
    const parts = selector.split(/\s+/);
    if (parts.length > 4) {
      this.warnings.push({
        type: 'maintainability',
        message: 'Overly specific selector (4+ levels deep)',
        selector,
        line,
        column: 1
      });
    }
  }

  private validateDeclaration(declaration: CSSDeclaration): void {
    const { property, value, line, column } = declaration;

    // Validate property name
    if (!this.isValidProperty(property)) {
      this.errors.push({
        type: 'property',
        message: `Unknown CSS property: ${property}`,
        property,
        line,
        column,
        severity: 'error'
      });
    }

    // Validate property value
    this.validateValue(property, value, line, column);

    // Check for vendor prefixes
    this.checkVendorPrefixes(property, line, column);

    // Check for accessibility issues
    this.checkAccessibility(property, value, line, column);
  }

  private isValidProperty(property: string): boolean {
    // Remove vendor prefixes for validation
    const cleanProperty = property.replace(/^-\w+-/, '');
    return VALID_CSS_PROPERTIES.has(cleanProperty) || property.startsWith('--'); // CSS custom properties
  }

  private validateValue(property: string, value: string, line: number, column: number): void {
    // Check for invalid units
    const unitRegex = /(\d+(?:\.\d+)?)(px|em|rem|%|vw|vh|vmin|vmax|cm|mm|in|pt|pc|ex|ch|fr|s|ms|deg|grad|rad|turn)/g;
    let match;

    while ((match = unitRegex.exec(value)) !== null) {
      const [, number, unit] = match;
      
      if (property.includes('time') || property.includes('duration') || property.includes('delay')) {
        if (!VALID_TIME_UNITS.has(unit)) {
          this.errors.push({
            type: 'value',
            message: `Invalid time unit: ${unit}`,
            property,
            line,
            column,
            severity: 'error'
          });
        }
      } else if (property.includes('angle') || property.includes('rotate')) {
        if (!VALID_ANGLE_UNITS.has(unit)) {
          this.errors.push({
            type: 'value',
            message: `Invalid angle unit: ${unit}`,
            property,
            line,
            column,
            severity: 'error'
          });
        }
      } else if (!VALID_LENGTH_UNITS.has(unit)) {
        this.warnings.push({
          type: 'browser-support',
          message: `Uncommon length unit: ${unit}`,
          property,
          line,
          column
        });
      }
    }

    // Check for magic numbers
    const numberRegex = /\b(\d{3,}(?:\.\d+)?)\b/g;
    if (numberRegex.test(value) && !value.includes('url(')) {
      this.metrics.maintainability.magicNumbers++;
      this.suggestions.push(`Consider using CSS custom properties for magic number at line ${line}`);
    }

    // Check for hardcoded colors
    const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(/;
    if (colorRegex.test(value)) {
      this.metrics.maintainability.hardcodedColors++;
      if (property === 'color' || property.includes('background')) {
        this.suggestions.push(`Consider using CSS custom properties for colors at line ${line}`);
      }
    }

    // Check for !important
    if (value.includes('!important')) {
      this.warnings.push({
        type: 'maintainability',
        message: 'Avoid using !important when possible',
        property,
        line,
        column
      });
    }
  }

  private checkVendorPrefixes(property: string, line: number, column: number): void {
    const hasPrefix = VENDOR_PREFIXES.some(prefix => property.startsWith(prefix));
    
    if (hasPrefix) {
      // Check if prefix is still needed (simplified check)
      const baseProperty = property.replace(/^-\w+-/, '');
      if (VALID_CSS_PROPERTIES.has(baseProperty)) {
        this.warnings.push({
          type: 'browser-support',
          message: `Vendor prefix may no longer be needed: ${property}`,
          property,
          line,
          column
        });
        this.metrics.performance.unusedPrefixes++;
      }
    }
  }

  private checkAccessibility(property: string, value: string, line: number, column: number): void {
    // Check for accessibility issues
    if (property === 'font-size' && value.includes('px') && parseInt(value) < 12) {
      this.warnings.push({
        type: 'accessibility',
        message: 'Font size may be too small for accessibility',
        property,
        line,
        column
      });
    }

    if (property === 'line-height' && parseFloat(value) < 1.2) {
      this.warnings.push({
        type: 'accessibility',
        message: 'Line height may be too small for readability',
        property,
        line,
        column
      });
    }

    if (property === 'color' && value === 'white' || value === '#fff' || value === '#ffffff') {
      this.suggestions.push(`Ensure sufficient color contrast at line ${line}`);
    }

    // Check for motion sensitivity
    if (property.includes('animation') && value.includes('infinite')) {
      this.suggestions.push(`Consider respecting prefers-reduced-motion for infinite animations at line ${line}`);
    }
  }

  private calculateSpecificity(selector: string): number {
    let specificity = 0;
    
    // Count IDs (100 points each)
    specificity += (selector.match(/#/g) || []).length * 100;
    
    // Count classes, attributes, pseudo-classes (10 points each)
    specificity += (selector.match(/\.|:|\[/g) || []).length * 10;
    
    // Count elements (1 point each)
    specificity += (selector.match(/\b[a-z]+\b/g) || []).length;
    
    return specificity;
  }

  private analyzeMetrics(rules: CSSRule[]): void {
    const specificities = rules.map(rule => rule.specificity);
    
    this.metrics.specificity.average = specificities.reduce((sum, s) => sum + s, 0) / specificities.length || 0;
    this.metrics.specificity.max = Math.max(...specificities, 0);
    
    // Count specificity distribution
    for (const specificity of specificities) {
      const range = this.getSpecificityRange(specificity);
      this.metrics.specificity.distribution[range] = (this.metrics.specificity.distribution[range] || 0) + 1;
    }
  }

  private getSpecificityRange(specificity: number): string {
    if (specificity >= 100) return '100+';
    if (specificity >= 50) return '50-99';
    if (specificity >= 20) return '20-49';
    if (specificity >= 10) return '10-19';
    return '0-9';
  }

  private checkPerformance(rules: CSSRule[]): void {
    const declarations = rules.flatMap(rule => rule.declarations);
    const propertyValues = new Map<string, string[]>();

    // Group declarations by property
    for (const decl of declarations) {
      const key = `${decl.property}:${decl.value}`;
      if (!propertyValues.has(key)) {
        propertyValues.set(key, []);
      }
      propertyValues.get(key)!.push(`${decl.line}:${decl.column}`);
    }

    // Find redundant declarations
    for (const [key, locations] of propertyValues) {
      if (locations.length > 1) {
        this.metrics.performance.redundantDeclarations++;
        this.suggestions.push(`Redundant declaration "${key}" found at: ${locations.join(', ')}`);
      }
    }
  }

  private checkMaintainability(rules: CSSRule[]): void {
    const selectorMap = new Map<string, number[]>();

    // Group rules by selector
    for (const rule of rules) {
      if (!selectorMap.has(rule.selector)) {
        selectorMap.set(rule.selector, []);
      }
      selectorMap.get(rule.selector)!.push(rule.line);
    }

    // Find duplicate selectors
    for (const [selector, lines] of selectorMap) {
      if (lines.length > 1) {
        this.metrics.maintainability.duplicateRules++;
        this.suggestions.push(`Duplicate selector "${selector}" at lines: ${lines.join(', ')}`);
      }
    }
  }

  private resetMetrics(): void {
    this.metrics = {
      totalRules: 0,
      totalDeclarations: 0,
      specificity: { average: 0, max: 0, distribution: {} },
      performance: { expensiveSelectors: 0, redundantDeclarations: 0, unusedPrefixes: 0 },
      maintainability: { duplicateRules: 0, magicNumbers: 0, hardcodedColors: 0 }
    };
  }

  private calculateScore(): number {
    const errorWeight = 10; // Reduced from 15
    const warningWeight = 3; // Reduced from 5
    const maxScore = 100;
    
    const deductions = (this.errors.length * errorWeight) + (this.warnings.length * warningWeight);
    return Math.max(0, maxScore - deductions);
  }
}

interface CSSRule {
  selector: string;
  declarations: CSSDeclaration[];
  line: number;
  specificity: number;
}

interface CSSDeclaration {
  property: string;
  value: string;
  line: number;
  column: number;
}