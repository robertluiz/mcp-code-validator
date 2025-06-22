/**
 * HTML/JSX Coherence Validator
 * Validates HTML element structure, attributes, and semantic coherence
 */

export interface HTMLElement {
  tag: string;
  attributes: Record<string, string>;
  children: HTMLElement[];
  text?: string;
  position: { line: number; column: number };
}

export interface HTMLValidationResult {
  isValid: boolean;
  errors: HTMLValidationError[];
  warnings: HTMLValidationWarning[];
  suggestions: string[];
  score: number; // 0-100
}

export interface HTMLValidationError {
  type: 'semantic' | 'structure' | 'attribute' | 'accessibility' | 'performance';
  message: string;
  element: string;
  line: number;
  severity: 'error' | 'warning';
}

export interface HTMLValidationWarning {
  type: 'semantic' | 'accessibility' | 'performance' | 'best-practice' | 'structure';
  message: string;
  element: string;
  line: number;
}

// Valid HTML5 elements
const VALID_HTML_ELEMENTS = new Set([
  // Document structure
  'html', 'head', 'body', 'title', 'meta', 'link', 'style', 'script',
  
  // Sectioning
  'header', 'nav', 'main', 'aside', 'footer', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  
  // Text content
  'div', 'span', 'p', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd',
  'figure', 'figcaption', 'hr', 'br',
  
  // Inline text
  'a', 'em', 'strong', 'small', 'mark', 'del', 'ins', 'sub', 'sup', 'i', 'b', 'u',
  'code', 'kbd', 'samp', 'var', 'time', 'data', 'abbr', 'cite', 'q', 'dfn',
  
  // Forms
  'form', 'fieldset', 'legend', 'label', 'input', 'button', 'select', 'option',
  'optgroup', 'textarea', 'output', 'progress', 'meter', 'datalist',
  
  // Interactive
  'details', 'summary', 'dialog',
  
  // Media
  'img', 'picture', 'source', 'video', 'audio', 'track', 'canvas', 'svg', 'map', 'area',
  
  // Tables
  'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'col', 'colgroup',
  
  // Embedded content
  'iframe', 'embed', 'object', 'param',
  
  // Obsolete but still valid
  'center', 'font'
]);

// Required attributes for specific elements
const REQUIRED_ATTRIBUTES: Record<string, string[]> = {
  'img': ['src', 'alt'],
  'a': [], // href is not always required (can be fragment identifier)
  'input': ['type'],
  'label': [], // for or form association
  'meta': ['content'],
  'link': ['rel'],
  'script': [], // src or content
  'iframe': ['src'],
  'area': ['alt'],
  'track': ['src', 'kind'],
  'source': ['src'],
  'param': ['name', 'value']
};

// Elements that shouldn't have children
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// Elements that can only contain specific children
const CONTENT_MODEL: Record<string, string[]> = {
  'ul': ['li'],
  'ol': ['li'],
  'dl': ['dt', 'dd'],
  'table': ['caption', 'thead', 'tbody', 'tfoot', 'tr', 'col', 'colgroup'],
  'thead': ['tr'],
  'tbody': ['tr'],
  'tfoot': ['tr'],
  'tr': ['th', 'td'],
  'select': ['option', 'optgroup'],
  'optgroup': ['option'],
  'picture': ['source', 'img']
};

export class HTMLCoherenceValidator {
  private errors: HTMLValidationError[] = [];
  private warnings: HTMLValidationWarning[] = [];
  private suggestions: string[] = [];

  validateHTML(html: string, isJSX: boolean = false): HTMLValidationResult {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];

    try {
      const elements = this.parseHTML(html, isJSX);
      
      for (const element of elements) {
        this.validateElement(element, isJSX);
        this.validateChildren(element, isJSX);
      }

      this.validateDocumentStructure(elements, isJSX);
      this.validateAccessibility(elements);
      this.validatePerformance(elements);

      const score = this.calculateScore();

      return {
        isValid: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions,
        score
      };
    } catch (error) {
      this.errors.push({
        type: 'structure',
        message: `HTML parsing error: ${error}`,
        element: 'document',
        line: 1,
        severity: 'error'
      });

      return {
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions,
        score: 0
      };
    }
  }

  private parseHTML(html: string, isJSX: boolean): HTMLElement[] {
    // Simple HTML parser - in a real implementation, use a proper parser like parse5
    const elements: HTMLElement[] = [];
    const stack: HTMLElement[] = [];
    
    // This is a simplified parser for demonstration
    // In production, you'd use a proper HTML/JSX parser
    const tagRegex = /<(\/?[\w-]+)([^>]*?)(?:\s*\/)?>/g;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      if (match && match.length >= 3) {
        const [fullMatch, tagName, attributes] = match;
        const lineNumber = html.substring(0, match.index).split('\n').length;
        
        if (tagName.startsWith('/')) {
          // Closing tag - pop from stack
          if (stack.length > 0) {
            stack.pop();
          }
        } else {
          const element: HTMLElement = {
            tag: tagName.toLowerCase(),
            attributes: this.parseAttributes(attributes, isJSX),
            children: [],
            position: { line: lineNumber, column: match.index }
          };
          
          if (stack.length > 0) {
            // Add as child to current parent
            stack[stack.length - 1].children.push(element);
          } else {
            // Root element
            elements.push(element);
          }
          
          // Push to stack if not self-closing and not void element
          const isSelfClosing = fullMatch.endsWith('/>');
          const isVoidElement = VOID_ELEMENTS.has(element.tag);
          
          if (!isSelfClosing && !isVoidElement) {
            stack.push(element);
          }
        }
      }
    }

    return elements;
  }

  private parseAttributes(attrString: string, isJSX: boolean): Record<string, string> {
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

  private validateElement(element: HTMLElement, isJSX: boolean): void {
    // Validate element name
    if (!isJSX && !VALID_HTML_ELEMENTS.has(element.tag)) {
      this.errors.push({
        type: 'structure',
        message: `Unknown HTML element: <${element.tag}>`,
        element: element.tag,
        line: element.position.line,
        severity: 'error'
      });
    }

    // Validate required attributes
    const required = REQUIRED_ATTRIBUTES[element.tag] || [];
    for (const attr of required) {
      if (!element.attributes[attr]) {
        this.errors.push({
          type: 'attribute',
          message: `Missing required attribute '${attr}' on <${element.tag}>`,
          element: element.tag,
          line: element.position.line,
          severity: 'error'
        });
      }
    }

    // Validate void elements don't have children
    if (VOID_ELEMENTS.has(element.tag) && element.children.length > 0) {
      this.errors.push({
        type: 'structure',
        message: `Void element <${element.tag}> cannot have children`,
        element: element.tag,
        line: element.position.line,
        severity: 'error'
      });
    }

    // Validate specific attributes
    this.validateAttributes(element, isJSX);
  }

  private validateAttributes(element: HTMLElement, isJSX: boolean): void {
    const { tag, attributes } = element;

    // Validate alt attribute for images
    if (tag === 'img' && (!attributes.alt || attributes.alt.trim() === '')) {
      this.warnings.push({
        type: 'accessibility',
        message: 'Image missing descriptive alt text',
        element: tag,
        line: element.position.line
      });
    }

    // Validate href for links
    if (tag === 'a' && attributes.href && attributes.href.startsWith('javascript:')) {
      this.warnings.push({
        type: 'best-practice',
        message: 'Avoid javascript: URLs, use event handlers instead',
        element: tag,
        line: element.position.line
      });
    }

    // Validate form inputs
    if (tag === 'input') {
      const type = attributes.type || 'text';
      if (type === 'email' && !attributes.pattern && !attributes.required) {
        this.suggestions.push(`Consider adding validation to email input at line ${element.position.line}`);
      }
    }

    // Validate button types
    if (tag === 'button' && !attributes.type) {
      this.warnings.push({
        type: 'best-practice',
        message: 'Button missing type attribute (defaults to submit)',
        element: tag,
        line: element.position.line
      });
    }
  }

  private validateChildren(element: HTMLElement, isJSX: boolean): void {
    const allowedChildren = CONTENT_MODEL[element.tag];
    
    if (allowedChildren && element.children.length > 0) {
      for (const child of element.children) {
        if (!allowedChildren.includes(child.tag)) {
          this.errors.push({
            type: 'structure',
            message: `<${child.tag}> is not allowed as child of <${element.tag}>`,
            element: element.tag,
            line: child.position.line,
            severity: 'error'
          });
        }
      }
    }

    // Recursively validate children
    for (const child of element.children) {
      this.validateElement(child, isJSX);
      this.validateChildren(child, isJSX);
    }
  }

  private validateDocumentStructure(elements: HTMLElement[], isJSX: boolean): void {
    if (isJSX) return; // JSX fragments don't need document structure

    const hasHtml = elements.some(el => el.tag === 'html');
    const hasHead = elements.some(el => el.tag === 'head');
    const hasBody = elements.some(el => el.tag === 'body');
    const hasTitle = elements.some(el => el.tag === 'title');

    if (!hasHtml) {
      this.warnings.push({
        type: 'structure',
        message: 'Document missing <html> element',
        element: 'document',
        line: 1
      });
    }

    if (!hasHead) {
      this.warnings.push({
        type: 'structure',
        message: 'Document missing <head> element',
        element: 'document',
        line: 1
      });
    }

    if (!hasBody) {
      this.warnings.push({
        type: 'structure',
        message: 'Document missing <body> element',
        element: 'document',
        line: 1
      });
    }

    if (!hasTitle) {
      this.warnings.push({
        type: 'accessibility',
        message: 'Document missing <title> element',
        element: 'document',
        line: 1
      });
    }
  }

  private validateAccessibility(elements: HTMLElement[]): void {
    const headings: HTMLElement[] = [];
    const images: HTMLElement[] = [];
    const forms: HTMLElement[] = [];

    // Collect elements for accessibility validation
    this.collectElements(elements, headings, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    this.collectElements(elements, images, ['img']);
    this.collectElements(elements, forms, ['form', 'input', 'button', 'select', 'textarea']);

    // Validate heading hierarchy
    let previousLevel = 0;
    for (const heading of headings) {
      const level = parseInt(heading.tag.substring(1));
      if (level > previousLevel + 1) {
        this.warnings.push({
          type: 'accessibility',
          message: `Heading level jumps from h${previousLevel} to h${level}`,
          element: heading.tag,
          line: heading.position.line
        });
      }
      previousLevel = level;
    }

    // Check for form labels
    for (const form of forms) {
      if (form.tag === 'input' && form.attributes.type !== 'submit' && form.attributes.type !== 'button') {
        const hasLabel = form.attributes.id && 
          elements.some(el => el.tag === 'label' && el.attributes.for === form.attributes.id);
        
        if (!hasLabel && !form.attributes['aria-label'] && !form.attributes['aria-labelledby']) {
          this.warnings.push({
            type: 'accessibility',
            message: 'Form input missing associated label',
            element: form.tag,
            line: form.position.line
          });
        }
      }
    }
  }

  private validatePerformance(elements: HTMLElement[]): void {
    const images: HTMLElement[] = [];
    const scripts: HTMLElement[] = [];
    
    this.collectElements(elements, images, ['img']);
    this.collectElements(elements, scripts, ['script']);

    // Check for lazy loading on images
    for (const img of images) {
      if (!img.attributes.loading && !img.attributes['data-src']) {
        this.suggestions.push(`Consider adding loading="lazy" to image at line ${img.position.line}`);
      }
    }

    // Check for async/defer on scripts
    for (const script of scripts) {
      if (script.attributes.src && !script.attributes.async && !script.attributes.defer) {
        this.suggestions.push(`Consider adding async or defer to script at line ${script.position.line}`);
      }
    }
  }

  private collectElements(elements: HTMLElement[], collection: HTMLElement[], tags: string[]): void {
    for (const element of elements) {
      if (tags.includes(element.tag)) {
        collection.push(element);
      }
      this.collectElements(element.children, collection, tags);
    }
  }

  private calculateScore(): number {
    const errorWeight = 10;
    const warningWeight = 5;
    const maxScore = 100;
    
    const deductions = (this.errors.length * errorWeight) + (this.warnings.length * warningWeight);
    return Math.max(0, maxScore - deductions);
  }
}