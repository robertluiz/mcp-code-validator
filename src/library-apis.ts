/**
 * Database of known APIs and functions from popular JavaScript/TypeScript libraries
 */

export interface LibraryAPI {
    name: string;
    version?: string;
    functions: string[];
    classes: string[];
    constants: string[];
    types: string[];
    hooks?: string[]; // For React libraries
}

export const KNOWN_LIBRARY_APIS: Record<string, LibraryAPI> = {
    'react': {
        name: 'react',
        functions: [
            'createElement', 'createContext', 'forwardRef', 'memo', 'lazy',
            'Suspense', 'Fragment', 'StrictMode', 'cloneElement', 'isValidElement'
        ],
        classes: ['Component', 'PureComponent'],
        constants: ['version'],
        types: ['FC', 'ReactNode', 'ReactElement', 'Props', 'RefObject'],
        hooks: [
            'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
            'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue',
            'useDeferredValue', 'useTransition', 'useId', 'useSyncExternalStore'
        ]
    },
    'react-dom': {
        name: 'react-dom',
        functions: ['render', 'unmountComponentAtNode', 'findDOMNode', 'createPortal'],
        classes: [],
        constants: ['version'],
        types: ['Root']
    },
    'next': {
        name: 'next',
        functions: [
            'getServerSideProps', 'getStaticProps', 'getStaticPaths',
            'generateMetadata', 'generateViewport'
        ],
        classes: [],
        constants: [],
        types: [
            'NextPage', 'NextPageContext', 'GetServerSideProps', 'GetStaticProps',
            'GetStaticPaths', 'NextApiRequest', 'NextApiResponse'
        ]
    },
    'next/router': {
        name: 'next/router',
        functions: ['useRouter', 'withRouter'],
        classes: [],
        constants: [],
        types: ['NextRouter']
    },
    'next/navigation': {
        name: 'next/navigation',
        functions: [
            'useRouter', 'usePathname', 'useSearchParams', 'useParams',
            'redirect', 'notFound', 'permanentRedirect'
        ],
        classes: [],
        constants: [],
        types: []
    },
    'lodash': {
        name: 'lodash',
        functions: [
            'map', 'filter', 'reduce', 'find', 'forEach', 'clone', 'cloneDeep',
            'merge', 'omit', 'pick', 'get', 'set', 'has', 'isArray', 'isObject',
            'isString', 'isNumber', 'isEmpty', 'isEqual', 'debounce', 'throttle',
            'capitalize', 'camelCase', 'kebabCase', 'snakeCase', 'startCase',
            'chunk', 'compact', 'concat', 'difference', 'intersection', 'union',
            'uniq', 'zip', 'flatten', 'groupBy', 'keyBy', 'orderBy', 'sortBy'
        ],
        classes: [],
        constants: ['VERSION'],
        types: []
    },
    'axios': {
        name: 'axios',
        functions: ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'request'],
        classes: ['Cancel', 'CancelToken'],
        constants: ['defaults'],
        types: ['AxiosResponse', 'AxiosError', 'AxiosRequestConfig']
    },
    'express': {
        name: 'express',
        functions: ['Router', 'static', 'json', 'urlencoded'],
        classes: ['Express'],
        constants: [],
        types: ['Request', 'Response', 'NextFunction', 'Application']
    },
    'fs': {
        name: 'fs',
        functions: [
            'readFile', 'readFileSync', 'writeFile', 'writeFileSync', 'appendFile',
            'appendFileSync', 'mkdir', 'mkdirSync', 'rmdir', 'rmdirSync', 'unlink',
            'unlinkSync', 'exists', 'existsSync', 'stat', 'statSync', 'readdir',
            'readdirSync', 'access', 'accessSync', 'chmod', 'chmodSync'
        ],
        classes: ['Stats', 'ReadStream', 'WriteStream'],
        constants: ['constants'],
        types: []
    },
    'path': {
        name: 'path',
        functions: [
            'join', 'resolve', 'basename', 'dirname', 'extname', 'parse', 'format',
            'isAbsolute', 'relative', 'normalize'
        ],
        classes: [],
        constants: ['sep', 'delimiter'],
        types: []
    },
    '@emotion/react': {
        name: '@emotion/react',
        functions: ['css', 'jsx', 'Global', 'ClassNames', 'keyframes'],
        classes: [],
        constants: [],
        types: ['Interpolation', 'SerializedStyles']
    },
    'styled-components': {
        name: 'styled-components',
        functions: ['styled', 'css', 'keyframes', 'createGlobalStyle', 'ThemeProvider'],
        classes: [],
        constants: [],
        types: ['DefaultTheme', 'StyledComponent']
    },
    'moment': {
        name: 'moment',
        functions: ['moment', 'duration', 'unix', 'utc'],
        classes: ['Moment', 'Duration'],
        constants: [],
        types: []
    },
    'date-fns': {
        name: 'date-fns',
        functions: [
            'format', 'parse', 'addDays', 'subDays', 'addMonths', 'subMonths',
            'addYears', 'subYears', 'differenceInDays', 'differenceInMonths',
            'isAfter', 'isBefore', 'isEqual', 'isValid', 'startOfDay', 'endOfDay'
        ],
        classes: [],
        constants: [],
        types: []
    },
    'uuid': {
        name: 'uuid',
        functions: ['v1', 'v3', 'v4', 'v5', 'validate', 'version'],
        classes: [],
        constants: [],
        types: []
    },
    'crypto': {
        name: 'crypto',
        functions: [
            'randomBytes', 'randomUUID', 'createHash', 'createHmac', 'pbkdf2',
            'scrypt', 'timingSafeEqual', 'createCipher', 'createDecipher'
        ],
        classes: ['Hash', 'Hmac'],
        constants: ['constants'],
        types: []
    },
    'zod': {
        name: 'zod',
        functions: ['z', 'object', 'string', 'number', 'boolean', 'array', 'union', 'optional'],
        classes: ['ZodSchema', 'ZodError'],
        constants: [],
        types: ['ZodType', 'ZodString', 'ZodNumber', 'ZodBoolean']
    },
    'typescript': {
        name: 'typescript',
        functions: [
            'createProgram', 'createCompilerHost', 'transpile', 'transpileModule',
            'createSourceFile', 'parseJsonConfigFileContent'
        ],
        classes: ['Program', 'TypeChecker', 'SourceFile'],
        constants: ['version'],
        types: ['Node', 'Type', 'Symbol', 'CompilerOptions']
    }
};

/**
 * Get API definitions for a specific library
 */
export function getLibraryAPI(libraryName: string): LibraryAPI | null {
    // First try exact match
    if (KNOWN_LIBRARY_APIS[libraryName]) {
        return KNOWN_LIBRARY_APIS[libraryName];
    }
    
    // Handle scoped packages (e.g., @emotion/react)
    if (libraryName.startsWith('@')) {
        return KNOWN_LIBRARY_APIS[libraryName] || null;
    }
    
    // Handle sub-modules like next/router, next/navigation
    const baseName = libraryName.split('/')[0];
    return KNOWN_LIBRARY_APIS[baseName] || null;
}

/**
 * Check if a function/class/constant exists in a given library
 */
export function isKnownLibraryMember(libraryName: string, memberName: string, memberType: 'function' | 'class' | 'constant' | 'type' | 'hook' = 'function'): boolean {
    const api = getLibraryAPI(libraryName);
    if (!api) return false;

    switch (memberType) {
        case 'function':
            return api.functions.includes(memberName);
        case 'class':
            return api.classes.includes(memberName);
        case 'constant':
            return api.constants.includes(memberName);
        case 'type':
            return api.types.includes(memberName);
        case 'hook':
            return api.hooks ? api.hooks.includes(memberName) : false;
        default:
            return false;
    }
}

/**
 * Get all known members of a library
 */
export function getAllLibraryMembers(libraryName: string): string[] {
    const api = getLibraryAPI(libraryName);
    if (!api) return [];

    return [
        ...api.functions,
        ...api.classes,
        ...api.constants,
        ...api.types,
        ...(api.hooks || [])
    ];
}

/**
 * Parse package.json dependencies and return list of library names
 */
export function parsePackageJsonDependencies(packageJsonContent: string): string[] {
    try {
        const pkg = JSON.parse(packageJsonContent);
        const dependencies = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
            ...pkg.peerDependencies
        };
        return Object.keys(dependencies);
    } catch (error) {
        console.error('Error parsing package.json:', error);
        return [];
    }
}