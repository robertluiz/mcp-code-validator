/**
 * HTML and CSS Indexer for Neo4j
 * Indexes HTML elements and CSS rules in the graph database
 */

import { Session } from 'neo4j-driver';
import { HTMLCoherenceValidator, HTMLElement as ValidatorHTMLElement } from './validators/html-coherence-validator';
import { CSSValidator } from './validators/css-validator';
import { TailwindValidator } from './validators/tailwind-validator';

export interface HTMLElement {
  tag: string;
  attributes: Record<string, string>;
  children: string[];
  textContent?: string;
  position: { line: number; column: number };
  id?: string;
  classes: string[];
}

export interface CSSRule {
  selector: string;
  declarations: CSSDeclaration[];
  line: number;
  specificity: number;
  mediaQuery?: string;
}

export interface CSSDeclaration {
  property: string;
  value: string;
  important: boolean;
  line: number;
  column: number;
}

export interface IndexingResult {
  htmlElements: number;
  cssRules: number;
  cssDeclarations: number;
  tailwindClasses: number;
  relationships: number;
  errors: string[];
}

export class HTMLCSSIndexer {
  private htmlValidator: HTMLCoherenceValidator;
  private cssValidator: CSSValidator;
  private tailwindValidator: TailwindValidator;

  constructor() {
    this.htmlValidator = new HTMLCoherenceValidator();
    this.cssValidator = new CSSValidator();
    this.tailwindValidator = new TailwindValidator();
  }

  /**
   * Index HTML content in Neo4j
   */
  async indexHTML(
    session: Session,
    html: string,
    filePath: string,
    projectContext: string = 'default',
    branch: string = 'main',
    isJSX: boolean = false
  ): Promise<IndexingResult> {
    const context = `${projectContext}:${branch}`;
    const result: IndexingResult = {
      htmlElements: 0,
      cssRules: 0,
      cssDeclarations: 0,
      tailwindClasses: 0,
      relationships: 0,
      errors: []
    };

    try {
      // Parse HTML elements
      const elements = this.parseHTMLElements(html, isJSX);
      
      // Create file node
      await session.executeWrite(tx =>
        tx.run(`
          MERGE (file:File {path: $filePath, context: $context})
          ON CREATE SET 
            file.type = $fileType,
            file.createdAt = timestamp()
          ON MATCH SET 
            file.updatedAt = timestamp()
        `, { 
          filePath, 
          context, 
          fileType: isJSX ? 'jsx' : 'html' 
        })
      );

      // Index each HTML element
      for (const element of elements) {
        await this.indexHTMLElement(session, element, filePath, context);
        result.htmlElements++;
      }

      // Create relationships between elements and their parent file
      await session.executeWrite(tx =>
        tx.run(`
          MATCH (file:File {path: $filePath, context: $context})
          MATCH (element:HTMLElement {filePath: $filePath, context: $context})
          MERGE (file)-[:CONTAINS_HTML]->(element)
        `, { filePath, context })
      );

      result.relationships += elements.length;

      // Index style relationships (class and inline styles)
      await this.indexStyleRelationships(session, elements, filePath, context);

      // Index Tailwind classes
      await this.indexTailwindClasses(session, elements, filePath, context, result);

    } catch (error: any) {
      result.errors.push(`HTML indexing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Index CSS content in Neo4j
   */
  async indexCSS(
    session: Session,
    css: string,
    filePath: string,
    projectContext: string = 'default',
    branch: string = 'main',
    isStyled: boolean = false
  ): Promise<IndexingResult> {
    const context = `${projectContext}:${branch}`;
    const result: IndexingResult = {
      htmlElements: 0,
      cssRules: 0,
      cssDeclarations: 0,
      tailwindClasses: 0,
      relationships: 0,
      errors: []
    };

    try {
      // Parse CSS rules
      const rules = this.parseCSSRules(css, isStyled);
      
      // Create file node
      await session.executeWrite(tx =>
        tx.run(`
          MERGE (file:File {path: $filePath, context: $context})
          ON CREATE SET 
            file.type = $fileType,
            file.createdAt = timestamp()
          ON MATCH SET 
            file.updatedAt = timestamp()
        `, { 
          filePath, 
          context, 
          fileType: isStyled ? 'styled-component' : 'css' 
        })
      );

      // Index each CSS rule
      for (const rule of rules) {
        await this.indexCSSRule(session, rule, filePath, context);
        result.cssRules++;
        result.cssDeclarations += rule.declarations.length;
      }

      // Create relationships between rules and their parent file
      await session.executeWrite(tx =>
        tx.run(`
          MATCH (file:File {path: $filePath, context: $context})
          MATCH (rule:CSSRule {filePath: $filePath, context: $context})
          MERGE (file)-[:CONTAINS_CSS]->(rule)
        `, { filePath, context })
      );

      result.relationships += rules.length;

    } catch (error: any) {
      result.errors.push(`CSS indexing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Parse HTML elements from content
   */
  private parseHTMLElements(html: string, isJSX: boolean): HTMLElement[] {
    const elements: HTMLElement[] = [];
    
    // Simple HTML/JSX parser - in production, use a proper parser
    const tagRegex = /<(\/?[\w-]+)([^>]*?)(?:\s*\/)?>([^<]*)/g;
    let match;
    let elementId = 0;

    while ((match = tagRegex.exec(html)) !== null) {
      if (match && match.length >= 3) {
        const [fullMatch, tagName, attributes, textContent] = match;
        
        if (!tagName.startsWith('/')) {
          const lineNumber = html.substring(0, match.index).split('\n').length;
          const element: HTMLElement = {
            tag: tagName.toLowerCase(),
            attributes: this.parseHTMLAttributes(attributes, isJSX),
            children: [],
            textContent: textContent?.trim() || undefined,
            position: { line: lineNumber, column: match.index },
            id: `element_${elementId++}`,
            classes: this.extractClasses(attributes)
          };
          elements.push(element);
        }
      }
    }

    return elements;
  }

  /**
   * Parse CSS rules from content
   */
  private parseCSSRules(css: string, isStyled: boolean): CSSRule[] {
    const rules: CSSRule[] = [];
    
    if (isStyled) {
      // Extract CSS from styled-components template literals
      css = this.extractStyledCSS(css);
    }

    // Simple CSS parser - in production, use a proper CSS parser like postcss
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(css)) !== null) {
      if (match && match.length >= 3) {
        const [, selector, declarations] = match;
        const lineNumber = css.substring(0, match.index).split('\n').length;
        
        const rule: CSSRule = {
          selector: selector.trim(),
          declarations: this.parseCSSDeclarations(declarations, lineNumber),
          line: lineNumber,
          specificity: this.calculateSpecificity(selector.trim())
        };
        
        rules.push(rule);
      }
    }

    return rules;
  }

  /**
   * Parse HTML attributes
   */
  private parseHTMLAttributes(attrString: string, isJSX: boolean): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    if (isJSX) {
      // JSX attribute parsing
      const jsxAttrRegex = /(\w+)(?:=(?:{([^}]*)}|"([^"]*)"|'([^']*)'))?/g;
      let match;
      
      while ((match = jsxAttrRegex.exec(attrString)) !== null) {
        const [, name, jsxValue, doubleQuoted, singleQuoted] = match;
        attributes[name] = jsxValue || doubleQuoted || singleQuoted || 'true';
      }
    } else {
      // HTML attribute parsing
      const htmlAttrRegex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g;
      let match;
      
      while ((match = htmlAttrRegex.exec(attrString)) !== null) {
        if (match && match.length >= 2) {
          const [, name, doubleQuoted, singleQuoted, unquoted] = match;
          attributes[name.toLowerCase()] = doubleQuoted || singleQuoted || unquoted || '';
        }
      }
    }

    return attributes;
  }

  /**
   * Extract CSS classes from attributes
   */
  private extractClasses(attributes: string): string[] {
    const classMatch = attributes.match(/class(?:Name)?=["']([^"']+)["']/);
    if (classMatch) {
      return classMatch[1].split(/\s+/).filter(Boolean);
    }
    return [];
  }

  /**
   * Parse CSS declarations
   */
  private parseCSSDeclarations(declarationsText: string, startLine: number): CSSDeclaration[] {
    const declarations: CSSDeclaration[] = [];
    const lines = declarationsText.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) return;

      const property = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).replace(';', '').trim();
      
      const important = value.endsWith('!important');
      if (important) {
        value = value.replace('!important', '').trim();
      }

      declarations.push({
        property,
        value,
        important,
        line: startLine + index,
        column: line.indexOf(property) + 1
      });
    });

    return declarations;
  }

  /**
   * Extract CSS from styled-components
   */
  private extractStyledCSS(styledCode: string): string {
    const templateRegex = /`([^`]+)`/g;
    let css = '';
    let match;

    while ((match = templateRegex.exec(styledCode)) !== null) {
      css += match[1] + '\n';
    }

    return css || styledCode;
  }

  /**
   * Calculate CSS specificity
   */
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

  /**
   * Index HTML element in Neo4j
   */
  private async indexHTMLElement(
    session: Session,
    element: HTMLElement,
    filePath: string,
    context: string
  ): Promise<void> {
    await session.executeWrite(tx =>
      tx.run(`
        MERGE (element:HTMLElement {
          id: $elementId,
          filePath: $filePath,
          context: $context
        })
        ON CREATE SET 
          element.tag = $tag,
          element.attributes = $attributes,
          element.textContent = $textContent,
          element.line = $line,
          element.column = $column,
          element.classes = $classes,
          element.createdAt = timestamp()
        ON MATCH SET 
          element.tag = $tag,
          element.attributes = $attributes,
          element.textContent = $textContent,
          element.line = $line,
          element.column = $column,
          element.classes = $classes,
          element.updatedAt = timestamp()
      `, {
        elementId: element.id,
        filePath,
        context,
        tag: element.tag,
        attributes: JSON.stringify(element.attributes),
        textContent: element.textContent,
        line: element.position.line,
        column: element.position.column,
        classes: element.classes
      })
    );
  }

  /**
   * Index CSS rule in Neo4j
   */
  private async indexCSSRule(
    session: Session,
    rule: CSSRule,
    filePath: string,
    context: string
  ): Promise<void> {
    // Create CSS rule node
    const ruleId = `${filePath}_${rule.line}_${rule.selector.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    await session.executeWrite(tx =>
      tx.run(`
        MERGE (rule:CSSRule {
          id: $ruleId,
          filePath: $filePath,
          context: $context
        })
        ON CREATE SET 
          rule.selector = $selector,
          rule.line = $line,
          rule.specificity = $specificity,
          rule.mediaQuery = $mediaQuery,
          rule.createdAt = timestamp()
        ON MATCH SET 
          rule.selector = $selector,
          rule.line = $line,
          rule.specificity = $specificity,
          rule.mediaQuery = $mediaQuery,
          rule.updatedAt = timestamp()
      `, {
        ruleId,
        filePath,
        context,
        selector: rule.selector,
        line: rule.line,
        specificity: rule.specificity,
        mediaQuery: rule.mediaQuery
      })
    );

    // Index CSS declarations
    for (const declaration of rule.declarations) {
      await this.indexCSSDeclaration(session, declaration, ruleId, context);
    }
  }

  /**
   * Index CSS declaration in Neo4j
   */
  private async indexCSSDeclaration(
    session: Session,
    declaration: CSSDeclaration,
    ruleId: string,
    context: string
  ): Promise<void> {
    const declarationId = `${ruleId}_${declaration.property}_${declaration.line}`;
    
    await session.executeWrite(tx =>
      tx.run(`
        MERGE (decl:CSSDeclaration {
          id: $declarationId,
          context: $context
        })
        ON CREATE SET 
          decl.property = $property,
          decl.value = $value,
          decl.important = $important,
          decl.line = $line,
          decl.column = $column,
          decl.createdAt = timestamp()
        ON MATCH SET 
          decl.property = $property,
          decl.value = $value,
          decl.important = $important,
          decl.line = $line,
          decl.column = $column,
          decl.updatedAt = timestamp()
          
        WITH decl
        MATCH (rule:CSSRule {id: $ruleId, context: $context})
        MERGE (rule)-[:HAS_DECLARATION]->(decl)
      `, {
        declarationId,
        context,
        property: declaration.property,
        value: declaration.value,
        important: declaration.important,
        line: declaration.line,
        column: declaration.column,
        ruleId
      })
    );
  }

  /**
   * Index relationships between HTML elements and CSS
   */
  private async indexStyleRelationships(
    session: Session,
    elements: HTMLElement[],
    filePath: string,
    context: string
  ): Promise<void> {
    for (const element of elements) {
      // Link elements to CSS rules via classes
      for (const className of element.classes) {
        await session.executeWrite(tx =>
          tx.run(`
            MATCH (element:HTMLElement {id: $elementId, context: $context})
            MATCH (rule:CSSRule {context: $context})
            WHERE rule.selector CONTAINS $className
            MERGE (element)-[:STYLED_BY {className: $className}]->(rule)
          `, {
            elementId: element.id,
            context,
            className: `.${className}`
          })
        );
      }

      // Handle inline styles
      const styleAttr = element.attributes.style;
      if (styleAttr) {
        await session.executeWrite(tx =>
          tx.run(`
            MATCH (element:HTMLElement {id: $elementId, context: $context})
            SET element.inlineStyles = $styles
          `, {
            elementId: element.id,
            context,
            styles: styleAttr
          })
        );
      }
    }
  }

  /**
   * Index Tailwind classes from HTML elements
   */
  private async indexTailwindClasses(
    session: Session,
    elements: HTMLElement[],
    filePath: string,
    context: string,
    result: IndexingResult
  ): Promise<void> {
    const allClasses = new Set<string>();
    
    // Collect all classes from elements
    for (const element of elements) {
      element.classes.forEach(className => allClasses.add(className));
    }

    if (allClasses.size === 0) return;

    // Validate all classes with Tailwind validator
    const classesString = Array.from(allClasses).join(' ');
    const validationResult = this.tailwindValidator.validateTailwindClasses(
      classesString,
      filePath,
      1
    );

    // Index each class in Neo4j
    for (const className of allClasses) {
      const classId = `${filePath}_${className.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const isTailwind = this.isTailwindClass(className, validationResult);
      const isValid = isTailwind && !validationResult.errors.some(err => err.className === className);
      
      await session.executeWrite(tx =>
        tx.run(`
          MERGE (twClass:TailwindClass {
            id: $classId,
            context: $context
          })
          ON CREATE SET 
            twClass.className = $className,
            twClass.filePath = $filePath,
            twClass.isTailwind = $isTailwind,
            twClass.isValid = $isValid,
            twClass.isArbitrary = $isArbitrary,
            twClass.isResponsive = $isResponsive,
            twClass.hasStateModifier = $hasStateModifier,
            twClass.createdAt = timestamp()
          ON MATCH SET 
            twClass.className = $className,
            twClass.filePath = $filePath,
            twClass.isTailwind = $isTailwind,
            twClass.isValid = $isValid,
            twClass.isArbitrary = $isArbitrary,
            twClass.isResponsive = $isResponsive,
            twClass.hasStateModifier = $hasStateModifier,
            twClass.updatedAt = timestamp()
        `, {
          classId,
          context,
          className,
          filePath,
          isTailwind,
          isValid,
          isArbitrary: this.isArbitraryValue(className),
          isResponsive: this.hasResponsivePrefix(className),
          hasStateModifier: this.hasStateModifier(className)
        })
      );

      result.tailwindClasses++;

      // Link class to file
      await session.executeWrite(tx =>
        tx.run(`
          MATCH (file:File {path: $filePath, context: $context})
          MATCH (twClass:TailwindClass {id: $classId, context: $context})
          MERGE (file)-[:CONTAINS_TAILWIND_CLASS]->(twClass)
        `, { filePath, context, classId })
      );

      // Link class to HTML elements that use it
      for (const element of elements) {
        if (element.classes.includes(className)) {
          await session.executeWrite(tx =>
            tx.run(`
              MATCH (element:HTMLElement {id: $elementId, context: $context})
              MATCH (twClass:TailwindClass {id: $classId, context: $context})
              MERGE (element)-[:USES_TAILWIND_CLASS]->(twClass)
            `, {
              elementId: element.id,
              context,
              classId
            })
          );
        }
      }
    }

    // Store validation results if there are errors or warnings
    if (validationResult.errors.length > 0 || validationResult.warnings.length > 0) {
      result.errors.push(`Tailwind validation issues: ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`);
    }
  }

  /**
   * Check if a class is a Tailwind class based on validation results
   */
  private isTailwindClass(className: string, validationResult: any): boolean {
    // A class is considered Tailwind if it's not marked as a custom class
    // and doesn't have an "unknown-class" error
    const hasUnknownError = validationResult.errors.some(
      (err: any) => err.className === className && err.type === 'unknown-class'
    );
    
    return !hasUnknownError;
  }

  /**
   * Check if a class uses arbitrary values
   */
  private isArbitraryValue(className: string): boolean {
    return className.includes('[') && className.includes(']');
  }

  /**
   * Check if a class has responsive prefix
   */
  private hasResponsivePrefix(className: string): boolean {
    const responsivePrefixes = ['sm:', 'md:', 'lg:', 'xl:', '2xl:'];
    return responsivePrefixes.some(prefix => className.startsWith(prefix));
  }

  /**
   * Check if a class has state modifier
   */
  private hasStateModifier(className: string): boolean {
    const stateModifiers = [
      'hover:', 'focus:', 'active:', 'visited:', 'disabled:', 'enabled:',
      'group-hover:', 'group-focus:', 'peer-hover:', 'peer-focus:',
      'dark:', 'first:', 'last:', 'odd:', 'even:'
    ];
    return stateModifiers.some(modifier => className.startsWith(modifier));
  }

  /**
   * Validate Tailwind classes in HTML content
   */
  async validateTailwindInHTML(
    html: string,
    filePath: string = '',
    isJSX: boolean = false
  ): Promise<any> {
    const elements = this.parseHTMLElements(html, isJSX);
    const allClasses = new Set<string>();
    
    // Collect all classes
    elements.forEach(element => {
      element.classes.forEach(className => allClasses.add(className));
    });

    if (allClasses.size === 0) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        score: 100,
        metrics: {
          totalClasses: 0,
          validClasses: 0,
          invalidClasses: 0,
          arbitraryValues: 0,
          customClasses: 0,
          responsiveClasses: 0,
          stateClasses: 0,
          duplicateClasses: 0,
          deprecatedClasses: 0
        }
      };
    }

    const classesString = Array.from(allClasses).join(' ');
    return this.tailwindValidator.validateTailwindClasses(classesString, filePath);
  }
}