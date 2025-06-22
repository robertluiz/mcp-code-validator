/**
 * Tailwind CSS Validator
 * Validates Tailwind utility classes, modifiers, and arbitrary values
 */

export interface TailwindValidationResult {
  isValid: boolean;
  errors: TailwindValidationError[];
  warnings: TailwindValidationWarning[];
  suggestions: string[];
  score: number; // 0-100
  metrics: TailwindMetrics;
}

export interface TailwindValidationError {
  type: 'unknown-class' | 'invalid-modifier' | 'invalid-arbitrary' | 'deprecated' | 'syntax';
  message: string;
  className: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

export interface TailwindValidationWarning {
  type: 'deprecated' | 'performance' | 'accessibility' | 'maintainability' | 'redundant';
  message: string;
  className: string;
  line: number;
  column: number;
}

export interface TailwindMetrics {
  totalClasses: number;
  validClasses: number;
  invalidClasses: number;
  arbitraryValues: number;
  customClasses: number;
  responsiveClasses: number;
  stateClasses: number;
  duplicateClasses: number;
  deprecatedClasses: number;
}

// Common Tailwind utility classes organized by category
const TAILWIND_UTILITIES = {
  // Layout
  display: ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'table', 'inline-table', 'table-caption', 'table-cell', 'table-column', 'table-column-group', 'table-footer-group', 'table-header-group', 'table-row-group', 'table-row', 'flow-root', 'grid', 'inline-grid', 'contents', 'list-item', 'hidden'],
  position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
  inset: ['inset-0', 'inset-x-0', 'inset-y-0', 'start-0', 'end-0', 'top-0', 'right-0', 'bottom-0', 'left-0'],
  visibility: ['visible', 'invisible', 'collapse'],
  zIndex: ['z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto'],
  
  // Flexbox & Grid
  flexDirection: ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse'],
  flexWrap: ['flex-wrap', 'flex-wrap-reverse', 'flex-nowrap'],
  flex: ['flex-1', 'flex-auto', 'flex-initial', 'flex-none'],
  grow: ['grow', 'grow-0'],
  shrink: ['shrink', 'shrink-0'],
  order: ['order-1', 'order-2', 'order-3', 'order-4', 'order-5', 'order-6', 'order-7', 'order-8', 'order-9', 'order-10', 'order-11', 'order-12', 'order-first', 'order-last', 'order-none'],
  gridTemplateColumns: ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6', 'grid-cols-7', 'grid-cols-8', 'grid-cols-9', 'grid-cols-10', 'grid-cols-11', 'grid-cols-12', 'grid-cols-none'],
  gridTemplateRows: ['grid-rows-1', 'grid-rows-2', 'grid-rows-3', 'grid-rows-4', 'grid-rows-5', 'grid-rows-6', 'grid-rows-none'],
  gridColumn: ['col-auto', 'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-5', 'col-span-6', 'col-span-7', 'col-span-8', 'col-span-9', 'col-span-10', 'col-span-11', 'col-span-12', 'col-span-full'],
  gridRow: ['row-auto', 'row-span-1', 'row-span-2', 'row-span-3', 'row-span-4', 'row-span-5', 'row-span-6', 'row-span-full'],
  gap: ['gap-0', 'gap-x-0', 'gap-y-0', 'gap-px', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-2.5', 'gap-3', 'gap-3.5', 'gap-4', 'gap-5', 'gap-6', 'gap-7', 'gap-8', 'gap-9', 'gap-10', 'gap-11', 'gap-12', 'gap-14', 'gap-16', 'gap-20', 'gap-24', 'gap-28', 'gap-32', 'gap-36', 'gap-40', 'gap-44', 'gap-48', 'gap-52', 'gap-56', 'gap-60', 'gap-64', 'gap-72', 'gap-80', 'gap-96'],
  justifyContent: ['justify-normal', 'justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly', 'justify-stretch'],
  justifyItems: ['justify-items-start', 'justify-items-end', 'justify-items-center', 'justify-items-stretch'],
  justifySelf: ['justify-self-auto', 'justify-self-start', 'justify-self-end', 'justify-self-center', 'justify-self-stretch'],
  alignContent: ['content-normal', 'content-center', 'content-start', 'content-end', 'content-between', 'content-around', 'content-evenly', 'content-baseline', 'content-stretch'],
  alignItems: ['items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch'],
  alignSelf: ['self-auto', 'self-start', 'self-end', 'self-center', 'self-stretch', 'self-baseline'],
  placeContent: ['place-content-center', 'place-content-start', 'place-content-end', 'place-content-between', 'place-content-around', 'place-content-evenly', 'place-content-baseline', 'place-content-stretch'],
  placeItems: ['place-items-start', 'place-items-end', 'place-items-center', 'place-items-baseline', 'place-items-stretch'],
  placeSelf: ['place-self-auto', 'place-self-start', 'place-self-end', 'place-self-center', 'place-self-stretch'],

  // Spacing
  padding: ['p-0', 'px-0', 'py-0', 'ps-0', 'pe-0', 'pt-0', 'pr-0', 'pb-0', 'pl-0', 'p-px', 'p-0.5', 'p-1', 'p-1.5', 'p-2', 'p-2.5', 'p-3', 'p-3.5', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8', 'p-9', 'p-10', 'p-11', 'p-12', 'p-14', 'p-16', 'p-20', 'p-24', 'p-28', 'p-32', 'p-36', 'p-40', 'p-44', 'p-48', 'p-52', 'p-56', 'p-60', 'p-64', 'p-72', 'p-80', 'p-96',
          'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'px-8', 'px-10', 'px-12', 'px-16', 'px-20', 'px-24',
          'py-1', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6', 'py-8', 'py-10', 'py-12', 'py-16', 'py-20', 'py-24',
          'pt-1', 'pt-2', 'pt-3', 'pt-4', 'pt-5', 'pt-6', 'pt-8', 'pt-10', 'pt-12', 'pt-16', 'pt-20', 'pt-24',
          'pr-1', 'pr-2', 'pr-3', 'pr-4', 'pr-5', 'pr-6', 'pr-8', 'pr-10', 'pr-12', 'pr-16', 'pr-20', 'pr-24',
          'pb-1', 'pb-2', 'pb-3', 'pb-4', 'pb-5', 'pb-6', 'pb-8', 'pb-10', 'pb-12', 'pb-16', 'pb-20', 'pb-24',
          'pl-1', 'pl-2', 'pl-3', 'pl-4', 'pl-5', 'pl-6', 'pl-8', 'pl-10', 'pl-12', 'pl-16', 'pl-20', 'pl-24'],
  margin: ['m-0', 'mx-0', 'my-0', 'ms-0', 'me-0', 'mt-0', 'mr-0', 'mb-0', 'ml-0', 'm-px', 'm-0.5', 'm-1', 'm-1.5', 'm-2', 'm-2.5', 'm-3', 'm-3.5', 'm-4', 'm-5', 'm-6', 'm-7', 'm-8', 'm-9', 'm-10', 'm-11', 'm-12', 'm-14', 'm-16', 'm-20', 'm-24', 'm-28', 'm-32', 'm-36', 'm-40', 'm-44', 'm-48', 'm-52', 'm-56', 'm-60', 'm-64', 'm-72', 'm-80', 'm-96', 'm-auto',
          'mx-1', 'mx-2', 'mx-3', 'mx-4', 'mx-5', 'mx-6', 'mx-8', 'mx-10', 'mx-12', 'mx-16', 'mx-20', 'mx-24', 'mx-auto',
          'my-1', 'my-2', 'my-3', 'my-4', 'my-5', 'my-6', 'my-8', 'my-10', 'my-12', 'my-16', 'my-20', 'my-24', 'my-auto',
          'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-5', 'mt-6', 'mt-8', 'mt-10', 'mt-12', 'mt-16', 'mt-20', 'mt-24', 'mt-auto',
          'mr-1', 'mr-2', 'mr-3', 'mr-4', 'mr-5', 'mr-6', 'mr-8', 'mr-10', 'mr-12', 'mr-16', 'mr-20', 'mr-24', 'mr-auto',
          'mb-1', 'mb-2', 'mb-3', 'mb-4', 'mb-5', 'mb-6', 'mb-8', 'mb-10', 'mb-12', 'mb-16', 'mb-20', 'mb-24', 'mb-auto',
          'ml-1', 'ml-2', 'ml-3', 'ml-4', 'ml-5', 'ml-6', 'ml-8', 'ml-10', 'ml-12', 'ml-16', 'ml-20', 'ml-24', 'ml-auto'],
  space: ['space-x-0', 'space-y-0', 'space-x-px', 'space-y-px', 'space-x-0.5', 'space-y-0.5', 'space-x-1', 'space-y-1', 'space-x-1.5', 'space-y-1.5', 'space-x-2', 'space-y-2', 'space-x-2.5', 'space-y-2.5', 'space-x-3', 'space-y-3', 'space-x-3.5', 'space-y-3.5', 'space-x-4', 'space-y-4', 'space-x-5', 'space-y-5', 'space-x-6', 'space-y-6', 'space-x-7', 'space-y-7', 'space-x-8', 'space-y-8', 'space-x-9', 'space-y-9', 'space-x-10', 'space-y-10', 'space-x-11', 'space-y-11', 'space-x-12', 'space-y-12', 'space-x-14', 'space-y-14', 'space-x-16', 'space-y-16', 'space-x-20', 'space-y-20', 'space-x-24', 'space-y-24', 'space-x-28', 'space-y-28', 'space-x-32', 'space-y-32', 'space-x-36', 'space-y-36', 'space-x-40', 'space-y-40', 'space-x-44', 'space-y-44', 'space-x-48', 'space-y-48', 'space-x-52', 'space-y-52', 'space-x-56', 'space-y-56', 'space-x-60', 'space-y-60', 'space-x-64', 'space-y-64', 'space-x-72', 'space-y-72', 'space-x-80', 'space-y-80', 'space-x-96', 'space-y-96', 'space-x-reverse', 'space-y-reverse'],

  // Sizing
  width: ['w-0', 'w-px', 'w-0.5', 'w-1', 'w-1.5', 'w-2', 'w-2.5', 'w-3', 'w-3.5', 'w-4', 'w-5', 'w-6', 'w-7', 'w-8', 'w-9', 'w-10', 'w-11', 'w-12', 'w-14', 'w-16', 'w-20', 'w-24', 'w-28', 'w-32', 'w-36', 'w-40', 'w-44', 'w-48', 'w-52', 'w-56', 'w-60', 'w-64', 'w-72', 'w-80', 'w-96', 'w-auto', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-2/4', 'w-3/4', 'w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-1/6', 'w-2/6', 'w-3/6', 'w-4/6', 'w-5/6', 'w-1/12', 'w-2/12', 'w-3/12', 'w-4/12', 'w-5/12', 'w-6/12', 'w-7/12', 'w-8/12', 'w-9/12', 'w-10/12', 'w-11/12', 'w-full', 'w-screen', 'w-svw', 'w-lvw', 'w-dvw', 'w-min', 'w-max', 'w-fit'],
  height: ['h-0', 'h-px', 'h-0.5', 'h-1', 'h-1.5', 'h-2', 'h-2.5', 'h-3', 'h-3.5', 'h-4', 'h-5', 'h-6', 'h-7', 'h-8', 'h-9', 'h-10', 'h-11', 'h-12', 'h-14', 'h-16', 'h-20', 'h-24', 'h-28', 'h-32', 'h-36', 'h-40', 'h-44', 'h-48', 'h-52', 'h-56', 'h-60', 'h-64', 'h-72', 'h-80', 'h-96', 'h-auto', 'h-1/2', 'h-1/3', 'h-2/3', 'h-1/4', 'h-2/4', 'h-3/4', 'h-1/5', 'h-2/5', 'h-3/5', 'h-4/5', 'h-1/6', 'h-2/6', 'h-3/6', 'h-4/6', 'h-5/6', 'h-full', 'h-screen', 'h-svh', 'h-lvh', 'h-dvh', 'h-min', 'h-max', 'h-fit'],

  // Typography
  fontFamily: ['font-sans', 'font-serif', 'font-mono'],
  fontSize: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'],
  fontWeight: ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
  lineHeight: ['leading-3', 'leading-4', 'leading-5', 'leading-6', 'leading-7', 'leading-8', 'leading-9', 'leading-10', 'leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose'],
  letterSpacing: ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest'],
  textAlign: ['text-left', 'text-center', 'text-right', 'text-justify', 'text-start', 'text-end'],
  textDecoration: ['underline', 'overline', 'line-through', 'no-underline'],
  textDecorationStyle: ['decoration-solid', 'decoration-double', 'decoration-dotted', 'decoration-dashed', 'decoration-wavy'],
  textDecorationThickness: ['decoration-auto', 'decoration-from-font', 'decoration-0', 'decoration-1', 'decoration-2', 'decoration-4', 'decoration-8'],
  textUnderlineOffset: ['underline-offset-auto', 'underline-offset-0', 'underline-offset-1', 'underline-offset-2', 'underline-offset-4', 'underline-offset-8'],
  textTransform: ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
  textOverflow: ['truncate', 'text-ellipsis', 'text-clip'],
  textIndent: ['indent-0', 'indent-px', 'indent-0.5', 'indent-1', 'indent-1.5', 'indent-2', 'indent-2.5', 'indent-3', 'indent-3.5', 'indent-4', 'indent-5', 'indent-6', 'indent-7', 'indent-8', 'indent-9', 'indent-10', 'indent-11', 'indent-12', 'indent-14', 'indent-16', 'indent-20', 'indent-24', 'indent-28', 'indent-32', 'indent-36', 'indent-40', 'indent-44', 'indent-48', 'indent-52', 'indent-56', 'indent-60', 'indent-64', 'indent-72', 'indent-80', 'indent-96'],
  verticalAlign: ['align-baseline', 'align-top', 'align-middle', 'align-bottom', 'align-text-top', 'align-text-bottom', 'align-sub', 'align-super'],
  whitespace: ['whitespace-normal', 'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-line', 'whitespace-pre-wrap', 'whitespace-break-spaces'],
  wordBreak: ['break-normal', 'break-words', 'break-all', 'break-keep'],
  hyphens: ['hyphens-none', 'hyphens-manual', 'hyphens-auto'],
  content: ['content-none'],

  // Colors
  backgroundColor: ['bg-inherit', 'bg-current', 'bg-transparent', 'bg-black', 'bg-white', 
    'bg-slate-50', 'bg-slate-100', 'bg-slate-200', 'bg-slate-300', 'bg-slate-400', 'bg-slate-500', 'bg-slate-600', 'bg-slate-700', 'bg-slate-800', 'bg-slate-900', 'bg-slate-950',
    'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900', 'bg-gray-950',
    'bg-zinc-50', 'bg-zinc-100', 'bg-zinc-200', 'bg-zinc-300', 'bg-zinc-400', 'bg-zinc-500', 'bg-zinc-600', 'bg-zinc-700', 'bg-zinc-800', 'bg-zinc-900', 'bg-zinc-950',
    'bg-neutral-50', 'bg-neutral-100', 'bg-neutral-200', 'bg-neutral-300', 'bg-neutral-400', 'bg-neutral-500', 'bg-neutral-600', 'bg-neutral-700', 'bg-neutral-800', 'bg-neutral-900', 'bg-neutral-950',
    'bg-stone-50', 'bg-stone-100', 'bg-stone-200', 'bg-stone-300', 'bg-stone-400', 'bg-stone-500', 'bg-stone-600', 'bg-stone-700', 'bg-stone-800', 'bg-stone-900', 'bg-stone-950',
    'bg-red-50', 'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500', 'bg-red-600', 'bg-red-700', 'bg-red-800', 'bg-red-900', 'bg-red-950',
    'bg-orange-50', 'bg-orange-100', 'bg-orange-200', 'bg-orange-300', 'bg-orange-400', 'bg-orange-500', 'bg-orange-600', 'bg-orange-700', 'bg-orange-800', 'bg-orange-900', 'bg-orange-950',
    'bg-amber-50', 'bg-amber-100', 'bg-amber-200', 'bg-amber-300', 'bg-amber-400', 'bg-amber-500', 'bg-amber-600', 'bg-amber-700', 'bg-amber-800', 'bg-amber-900', 'bg-amber-950',
    'bg-yellow-50', 'bg-yellow-100', 'bg-yellow-200', 'bg-yellow-300', 'bg-yellow-400', 'bg-yellow-500', 'bg-yellow-600', 'bg-yellow-700', 'bg-yellow-800', 'bg-yellow-900', 'bg-yellow-950',
    'bg-lime-50', 'bg-lime-100', 'bg-lime-200', 'bg-lime-300', 'bg-lime-400', 'bg-lime-500', 'bg-lime-600', 'bg-lime-700', 'bg-lime-800', 'bg-lime-900', 'bg-lime-950',
    'bg-green-50', 'bg-green-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500', 'bg-green-600', 'bg-green-700', 'bg-green-800', 'bg-green-900', 'bg-green-950',
    'bg-emerald-50', 'bg-emerald-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-700', 'bg-emerald-800', 'bg-emerald-900', 'bg-emerald-950',
    'bg-teal-50', 'bg-teal-100', 'bg-teal-200', 'bg-teal-300', 'bg-teal-400', 'bg-teal-500', 'bg-teal-600', 'bg-teal-700', 'bg-teal-800', 'bg-teal-900', 'bg-teal-950',
    'bg-cyan-50', 'bg-cyan-100', 'bg-cyan-200', 'bg-cyan-300', 'bg-cyan-400', 'bg-cyan-500', 'bg-cyan-600', 'bg-cyan-700', 'bg-cyan-800', 'bg-cyan-900', 'bg-cyan-950',
    'bg-sky-50', 'bg-sky-100', 'bg-sky-200', 'bg-sky-300', 'bg-sky-400', 'bg-sky-500', 'bg-sky-600', 'bg-sky-700', 'bg-sky-800', 'bg-sky-900', 'bg-sky-950',
    'bg-blue-50', 'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800', 'bg-blue-900', 'bg-blue-950',
    'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-300', 'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600', 'bg-indigo-700', 'bg-indigo-800', 'bg-indigo-900', 'bg-indigo-950',
    'bg-violet-50', 'bg-violet-100', 'bg-violet-200', 'bg-violet-300', 'bg-violet-400', 'bg-violet-500', 'bg-violet-600', 'bg-violet-700', 'bg-violet-800', 'bg-violet-900', 'bg-violet-950',
    'bg-purple-50', 'bg-purple-100', 'bg-purple-200', 'bg-purple-300', 'bg-purple-400', 'bg-purple-500', 'bg-purple-600', 'bg-purple-700', 'bg-purple-800', 'bg-purple-900', 'bg-purple-950',
    'bg-fuchsia-50', 'bg-fuchsia-100', 'bg-fuchsia-200', 'bg-fuchsia-300', 'bg-fuchsia-400', 'bg-fuchsia-500', 'bg-fuchsia-600', 'bg-fuchsia-700', 'bg-fuchsia-800', 'bg-fuchsia-900', 'bg-fuchsia-950',
    'bg-pink-50', 'bg-pink-100', 'bg-pink-200', 'bg-pink-300', 'bg-pink-400', 'bg-pink-500', 'bg-pink-600', 'bg-pink-700', 'bg-pink-800', 'bg-pink-900', 'bg-pink-950',
    'bg-rose-50', 'bg-rose-100', 'bg-rose-200', 'bg-rose-300', 'bg-rose-400', 'bg-rose-500', 'bg-rose-600', 'bg-rose-700', 'bg-rose-800', 'bg-rose-900', 'bg-rose-950'],
  textColor: ['text-inherit', 'text-current', 'text-transparent', 'text-black', 'text-white', 
    'text-slate-50', 'text-slate-100', 'text-slate-200', 'text-slate-300', 'text-slate-400', 'text-slate-500', 'text-slate-600', 'text-slate-700', 'text-slate-800', 'text-slate-900', 'text-slate-950',
    'text-gray-50', 'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900', 'text-gray-950',
    'text-zinc-50', 'text-zinc-100', 'text-zinc-200', 'text-zinc-300', 'text-zinc-400', 'text-zinc-500', 'text-zinc-600', 'text-zinc-700', 'text-zinc-800', 'text-zinc-900', 'text-zinc-950',
    'text-neutral-50', 'text-neutral-100', 'text-neutral-200', 'text-neutral-300', 'text-neutral-400', 'text-neutral-500', 'text-neutral-600', 'text-neutral-700', 'text-neutral-800', 'text-neutral-900', 'text-neutral-950',
    'text-stone-50', 'text-stone-100', 'text-stone-200', 'text-stone-300', 'text-stone-400', 'text-stone-500', 'text-stone-600', 'text-stone-700', 'text-stone-800', 'text-stone-900', 'text-stone-950',
    'text-red-50', 'text-red-100', 'text-red-200', 'text-red-300', 'text-red-400', 'text-red-500', 'text-red-600', 'text-red-700', 'text-red-800', 'text-red-900', 'text-red-950',
    'text-orange-50', 'text-orange-100', 'text-orange-200', 'text-orange-300', 'text-orange-400', 'text-orange-500', 'text-orange-600', 'text-orange-700', 'text-orange-800', 'text-orange-900', 'text-orange-950',
    'text-amber-50', 'text-amber-100', 'text-amber-200', 'text-amber-300', 'text-amber-400', 'text-amber-500', 'text-amber-600', 'text-amber-700', 'text-amber-800', 'text-amber-900', 'text-amber-950',
    'text-yellow-50', 'text-yellow-100', 'text-yellow-200', 'text-yellow-300', 'text-yellow-400', 'text-yellow-500', 'text-yellow-600', 'text-yellow-700', 'text-yellow-800', 'text-yellow-900', 'text-yellow-950',
    'text-lime-50', 'text-lime-100', 'text-lime-200', 'text-lime-300', 'text-lime-400', 'text-lime-500', 'text-lime-600', 'text-lime-700', 'text-lime-800', 'text-lime-900', 'text-lime-950',
    'text-green-50', 'text-green-100', 'text-green-200', 'text-green-300', 'text-green-400', 'text-green-500', 'text-green-600', 'text-green-700', 'text-green-800', 'text-green-900', 'text-green-950',
    'text-emerald-50', 'text-emerald-100', 'text-emerald-200', 'text-emerald-300', 'text-emerald-400', 'text-emerald-500', 'text-emerald-600', 'text-emerald-700', 'text-emerald-800', 'text-emerald-900', 'text-emerald-950',
    'text-teal-50', 'text-teal-100', 'text-teal-200', 'text-teal-300', 'text-teal-400', 'text-teal-500', 'text-teal-600', 'text-teal-700', 'text-teal-800', 'text-teal-900', 'text-teal-950',
    'text-cyan-50', 'text-cyan-100', 'text-cyan-200', 'text-cyan-300', 'text-cyan-400', 'text-cyan-500', 'text-cyan-600', 'text-cyan-700', 'text-cyan-800', 'text-cyan-900', 'text-cyan-950',
    'text-sky-50', 'text-sky-100', 'text-sky-200', 'text-sky-300', 'text-sky-400', 'text-sky-500', 'text-sky-600', 'text-sky-700', 'text-sky-800', 'text-sky-900', 'text-sky-950',
    'text-blue-50', 'text-blue-100', 'text-blue-200', 'text-blue-300', 'text-blue-400', 'text-blue-500', 'text-blue-600', 'text-blue-700', 'text-blue-800', 'text-blue-900', 'text-blue-950',
    'text-indigo-50', 'text-indigo-100', 'text-indigo-200', 'text-indigo-300', 'text-indigo-400', 'text-indigo-500', 'text-indigo-600', 'text-indigo-700', 'text-indigo-800', 'text-indigo-900', 'text-indigo-950',
    'text-violet-50', 'text-violet-100', 'text-violet-200', 'text-violet-300', 'text-violet-400', 'text-violet-500', 'text-violet-600', 'text-violet-700', 'text-violet-800', 'text-violet-900', 'text-violet-950',
    'text-purple-50', 'text-purple-100', 'text-purple-200', 'text-purple-300', 'text-purple-400', 'text-purple-500', 'text-purple-600', 'text-purple-700', 'text-purple-800', 'text-purple-900', 'text-purple-950',
    'text-fuchsia-50', 'text-fuchsia-100', 'text-fuchsia-200', 'text-fuchsia-300', 'text-fuchsia-400', 'text-fuchsia-500', 'text-fuchsia-600', 'text-fuchsia-700', 'text-fuchsia-800', 'text-fuchsia-900', 'text-fuchsia-950',
    'text-pink-50', 'text-pink-100', 'text-pink-200', 'text-pink-300', 'text-pink-400', 'text-pink-500', 'text-pink-600', 'text-pink-700', 'text-pink-800', 'text-pink-900', 'text-pink-950',
    'text-rose-50', 'text-rose-100', 'text-rose-200', 'text-rose-300', 'text-rose-400', 'text-rose-500', 'text-rose-600', 'text-rose-700', 'text-rose-800', 'text-rose-900', 'text-rose-950'],

  // Borders
  borderRadius: ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full', 'rounded-s-none', 'rounded-s-sm', 'rounded-s', 'rounded-s-md', 'rounded-s-lg', 'rounded-s-xl', 'rounded-s-2xl', 'rounded-s-3xl', 'rounded-s-full', 'rounded-e-none', 'rounded-e-sm', 'rounded-e', 'rounded-e-md', 'rounded-e-lg', 'rounded-e-xl', 'rounded-e-2xl', 'rounded-e-3xl', 'rounded-e-full', 'rounded-t-none', 'rounded-t-sm', 'rounded-t', 'rounded-t-md', 'rounded-t-lg', 'rounded-t-xl', 'rounded-t-2xl', 'rounded-t-3xl', 'rounded-t-full', 'rounded-r-none', 'rounded-r-sm', 'rounded-r', 'rounded-r-md', 'rounded-r-lg', 'rounded-r-xl', 'rounded-r-2xl', 'rounded-r-3xl', 'rounded-r-full', 'rounded-b-none', 'rounded-b-sm', 'rounded-b', 'rounded-b-md', 'rounded-b-lg', 'rounded-b-xl', 'rounded-b-2xl', 'rounded-b-3xl', 'rounded-b-full', 'rounded-l-none', 'rounded-l-sm', 'rounded-l', 'rounded-l-md', 'rounded-l-lg', 'rounded-l-xl', 'rounded-l-2xl', 'rounded-l-3xl', 'rounded-l-full', 'rounded-ss-none', 'rounded-ss-sm', 'rounded-ss', 'rounded-ss-md', 'rounded-ss-lg', 'rounded-ss-xl', 'rounded-ss-2xl', 'rounded-ss-3xl', 'rounded-ss-full', 'rounded-se-none', 'rounded-se-sm', 'rounded-se', 'rounded-se-md', 'rounded-se-lg', 'rounded-se-xl', 'rounded-se-2xl', 'rounded-se-3xl', 'rounded-se-full', 'rounded-ee-none', 'rounded-ee-sm', 'rounded-ee', 'rounded-ee-md', 'rounded-ee-lg', 'rounded-ee-xl', 'rounded-ee-2xl', 'rounded-ee-3xl', 'rounded-ee-full', 'rounded-es-none', 'rounded-es-sm', 'rounded-es', 'rounded-es-md', 'rounded-es-lg', 'rounded-es-xl', 'rounded-es-2xl', 'rounded-es-3xl', 'rounded-es-full', 'rounded-tl-none', 'rounded-tl-sm', 'rounded-tl', 'rounded-tl-md', 'rounded-tl-lg', 'rounded-tl-xl', 'rounded-tl-2xl', 'rounded-tl-3xl', 'rounded-tl-full', 'rounded-tr-none', 'rounded-tr-sm', 'rounded-tr', 'rounded-tr-md', 'rounded-tr-lg', 'rounded-tr-xl', 'rounded-tr-2xl', 'rounded-tr-3xl', 'rounded-tr-full', 'rounded-br-none', 'rounded-br-sm', 'rounded-br', 'rounded-br-md', 'rounded-br-lg', 'rounded-br-xl', 'rounded-br-2xl', 'rounded-br-3xl', 'rounded-br-full', 'rounded-bl-none', 'rounded-bl-sm', 'rounded-bl', 'rounded-bl-md', 'rounded-bl-lg', 'rounded-bl-xl', 'rounded-bl-2xl', 'rounded-bl-3xl', 'rounded-bl-full'],
  borderWidth: ['border-0', 'border-2', 'border-4', 'border-8', 'border', 'border-x-0', 'border-x-2', 'border-x-4', 'border-x-8', 'border-x', 'border-y-0', 'border-y-2', 'border-y-4', 'border-y-8', 'border-y', 'border-s-0', 'border-s-2', 'border-s-4', 'border-s-8', 'border-s', 'border-e-0', 'border-e-2', 'border-e-4', 'border-e-8', 'border-e', 'border-t-0', 'border-t-2', 'border-t-4', 'border-t-8', 'border-t', 'border-r-0', 'border-r-2', 'border-r-4', 'border-r-8', 'border-r', 'border-b-0', 'border-b-2', 'border-b-4', 'border-b-8', 'border-b', 'border-l-0', 'border-l-2', 'border-l-4', 'border-l-8', 'border-l'],
  borderStyle: ['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden', 'border-none'],

  // Effects
  boxShadow: ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow-none'],
  opacity: ['opacity-0', 'opacity-5', 'opacity-10', 'opacity-15', 'opacity-20', 'opacity-25', 'opacity-30', 'opacity-35', 'opacity-40', 'opacity-45', 'opacity-50', 'opacity-55', 'opacity-60', 'opacity-65', 'opacity-70', 'opacity-75', 'opacity-80', 'opacity-85', 'opacity-90', 'opacity-95', 'opacity-100'],
  transform: ['scale-0', 'scale-50', 'scale-75', 'scale-90', 'scale-95', 'scale-100', 'scale-105', 'scale-110', 'scale-125', 'scale-150'],
  transitionProperty: ['transition-none', 'transition-all', 'transition', 'transition-colors', 'transition-opacity', 'transition-shadow', 'transition-transform'],
  transitionDuration: ['duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700', 'duration-1000'],
  transitionTimingFunction: ['ease-linear', 'ease-in', 'ease-out', 'ease-in-out'],
  ring: ['ring-0', 'ring-1', 'ring-2', 'ring-4', 'ring-8', 'ring', 'ring-inset'],

  // Interactive
  cursor: ['cursor-auto', 'cursor-default', 'cursor-pointer', 'cursor-wait', 'cursor-text', 'cursor-move', 'cursor-help', 'cursor-not-allowed', 'cursor-none', 'cursor-context-menu', 'cursor-progress', 'cursor-cell', 'cursor-crosshair', 'cursor-vertical-text', 'cursor-alias', 'cursor-copy', 'cursor-no-drop', 'cursor-grab', 'cursor-grabbing', 'cursor-all-scroll', 'cursor-col-resize', 'cursor-row-resize', 'cursor-n-resize', 'cursor-e-resize', 'cursor-s-resize', 'cursor-w-resize', 'cursor-ne-resize', 'cursor-nw-resize', 'cursor-se-resize', 'cursor-sw-resize', 'cursor-ew-resize', 'cursor-ns-resize', 'cursor-nesw-resize', 'cursor-nwse-resize', 'cursor-zoom-in', 'cursor-zoom-out'],
  pointerEvents: ['pointer-events-none', 'pointer-events-auto'],
  resize: ['resize-none', 'resize-y', 'resize-x', 'resize'],
  scrollBehavior: ['scroll-auto', 'scroll-smooth'],
  scrollMargin: ['scroll-m-0', 'scroll-mx-0', 'scroll-my-0', 'scroll-ms-0', 'scroll-me-0', 'scroll-mt-0', 'scroll-mr-0', 'scroll-mb-0', 'scroll-ml-0', 'scroll-m-px', 'scroll-m-0.5', 'scroll-m-1', 'scroll-m-1.5', 'scroll-m-2', 'scroll-m-2.5', 'scroll-m-3', 'scroll-m-3.5', 'scroll-m-4', 'scroll-m-5', 'scroll-m-6', 'scroll-m-7', 'scroll-m-8', 'scroll-m-9', 'scroll-m-10', 'scroll-m-11', 'scroll-m-12', 'scroll-m-14', 'scroll-m-16', 'scroll-m-20', 'scroll-m-24', 'scroll-m-28', 'scroll-m-32', 'scroll-m-36', 'scroll-m-40', 'scroll-m-44', 'scroll-m-48', 'scroll-m-52', 'scroll-m-56', 'scroll-m-60', 'scroll-m-64', 'scroll-m-72', 'scroll-m-80', 'scroll-m-96'],
  scrollPadding: ['scroll-p-0', 'scroll-px-0', 'scroll-py-0', 'scroll-ps-0', 'scroll-pe-0', 'scroll-pt-0', 'scroll-pr-0', 'scroll-pb-0', 'scroll-pl-0', 'scroll-p-px', 'scroll-p-0.5', 'scroll-p-1', 'scroll-p-1.5', 'scroll-p-2', 'scroll-p-2.5', 'scroll-p-3', 'scroll-p-3.5', 'scroll-p-4', 'scroll-p-5', 'scroll-p-6', 'scroll-p-7', 'scroll-p-8', 'scroll-p-9', 'scroll-p-10', 'scroll-p-11', 'scroll-p-12', 'scroll-p-14', 'scroll-p-16', 'scroll-p-20', 'scroll-p-24', 'scroll-p-28', 'scroll-p-32', 'scroll-p-36', 'scroll-p-40', 'scroll-p-44', 'scroll-p-48', 'scroll-p-52', 'scroll-p-56', 'scroll-p-60', 'scroll-p-64', 'scroll-p-72', 'scroll-p-80', 'scroll-p-96'],
  scrollSnapAlign: ['snap-start', 'snap-end', 'snap-center', 'snap-align-none'],
  scrollSnapStop: ['snap-normal', 'snap-always'],
  scrollSnapType: ['snap-none', 'snap-x', 'snap-y', 'snap-both', 'snap-mandatory', 'snap-proximity'],
  touchAction: ['touch-auto', 'touch-none', 'touch-pan-x', 'touch-pan-left', 'touch-pan-right', 'touch-pan-y', 'touch-pan-up', 'touch-pan-down', 'touch-pinch-zoom', 'touch-manipulation'],
  userSelect: ['select-none', 'select-text', 'select-all', 'select-auto'],
  willChange: ['will-change-auto', 'will-change-scroll', 'will-change-contents', 'will-change-transform']
};

// Responsive breakpoints
const RESPONSIVE_PREFIXES = ['sm:', 'md:', 'lg:', 'xl:', '2xl:'];

// State modifiers
const STATE_MODIFIERS = [
  'hover:', 'focus:', 'focus-within:', 'focus-visible:', 'active:', 'visited:', 'target:', 'first:', 'last:', 'only:', 'odd:', 'even:', 'first-of-type:', 'last-of-type:', 'only-of-type:', 'empty:', 'disabled:', 'enabled:', 'checked:', 'indeterminate:', 'default:', 'required:', 'valid:', 'invalid:', 'in-range:', 'out-of-range:', 'placeholder-shown:', 'autofill:', 'read-only:', 'before:', 'after:', 'first-letter:', 'first-line:', 'marker:', 'selection:', 'file:', 'backdrop:', 'placeholder:', 'group-hover:', 'group-focus:', 'group-focus-within:', 'group-focus-visible:', 'group-active:', 'group-visited:', 'group-target:', 'group-first:', 'group-last:', 'group-only:', 'group-odd:', 'group-even:', 'group-first-of-type:', 'group-last-of-type:', 'group-only-of-type:', 'group-empty:', 'group-disabled:', 'group-enabled:', 'group-checked:', 'group-indeterminate:', 'group-default:', 'group-required:', 'group-valid:', 'group-invalid:', 'group-in-range:', 'group-out-of-range:', 'group-placeholder-shown:', 'group-autofill:', 'group-read-only:', 'peer-hover:', 'peer-focus:', 'peer-focus-within:', 'peer-focus-visible:', 'peer-active:', 'peer-visited:', 'peer-target:', 'peer-first:', 'peer-last:', 'peer-only:', 'peer-odd:', 'peer-even:', 'peer-first-of-type:', 'peer-last-of-type:', 'peer-only-of-type:', 'peer-empty:', 'peer-disabled:', 'peer-enabled:', 'peer-checked:', 'peer-indeterminate:', 'peer-default:', 'peer-required:', 'peer-valid:', 'peer-invalid:', 'peer-in-range:', 'peer-out-of-range:', 'peer-placeholder-shown:', 'peer-autofill:', 'peer-read-only:', 'open:', 'group-open:', 'peer-open:', 'motion-safe:', 'motion-reduce:', 'contrast-more:', 'contrast-less:', 'print:', 'portrait:', 'landscape:', 'ltr:', 'rtl:', 'dark:', 'supports-grid:', 'supports-no-grid:'
];

// Deprecated classes (Tailwind v2 -> v3 migration)
const DEPRECATED_CLASSES = new Map([
  ['bg-opacity-', 'Use bg-{color}/{opacity} format instead'],
  ['text-opacity-', 'Use text-{color}/{opacity} format instead'],
  ['border-opacity-', 'Use border-{color}/{opacity} format instead'],
  ['placeholder-opacity-', 'Use placeholder-{color}/{opacity} format instead'],
  ['divide-opacity-', 'Use divide-{color}/{opacity} format instead'],
  ['ring-opacity-', 'Use ring-{color}/{opacity} format instead'],
  ['shadow-outline', 'Use ring-2 ring-blue-500/50 instead'],
  ['shadow-xs', 'Use shadow-sm instead'],
  ['whitespace-no-wrap', 'Use whitespace-nowrap instead'],
  ['overflow-ellipsis', 'Use text-ellipsis instead'],
  ['transform', 'Transform utilities are now automatically applied'],
  ['filter', 'Filter utilities are now automatically applied'],
  ['backdrop-filter', 'Backdrop filter utilities are now automatically applied']
]);

// Create a comprehensive set of all valid classes
function createValidClassesSet(): Set<string> {
  const validClasses = new Set<string>();
  
  // Add all utility classes
  Object.values(TAILWIND_UTILITIES).forEach(utilities => {
    utilities.forEach(utility => validClasses.add(utility));
  });
  
  // Add responsive variants
  RESPONSIVE_PREFIXES.forEach(prefix => {
    Object.values(TAILWIND_UTILITIES).forEach(utilities => {
      utilities.forEach(utility => validClasses.add(prefix + utility));
    });
  });
  
  // Add state variants
  STATE_MODIFIERS.forEach(modifier => {
    Object.values(TAILWIND_UTILITIES).forEach(utilities => {
      utilities.forEach(utility => validClasses.add(modifier + utility));
    });
  });
  
  return validClasses;
}

const VALID_TAILWIND_CLASSES = createValidClassesSet();

export class TailwindValidator {
  private errors: TailwindValidationError[] = [];
  private warnings: TailwindValidationWarning[] = [];
  private suggestions: string[] = [];
  private metrics: TailwindMetrics = {
    totalClasses: 0,
    validClasses: 0,
    invalidClasses: 0,
    arbitraryValues: 0,
    customClasses: 0,
    responsiveClasses: 0,
    stateClasses: 0,
    duplicateClasses: 0,
    deprecatedClasses: 0
  };

  validateTailwindClasses(classNames: string, filePath: string = '', line: number = 1): TailwindValidationResult {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
    this.resetMetrics();

    try {
      const classes = this.extractClasses(classNames);
      
      for (let i = 0; i < classes.length; i++) {
        const className = classes[i];
        this.validateClass(className, line, i + 1);
      }

      this.analyzeClassUsage(classes);
      this.checkForDuplicates(classes, line);
      this.checkAccessibility(classes, line);
      this.checkPerformance(classes, line);

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
        message: `Tailwind validation error: ${error}`,
        className: '',
        line,
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

  private extractClasses(classNames: string): string[] {
    // Handle both space-separated and comma-separated class lists
    return classNames
      .replace(/[\n\r\t]+/g, ' ')
      .split(/[\s,]+/)
      .map(cls => cls.trim())
      .filter(cls => cls.length > 0);
  }

  private validateClass(className: string, line: number, column: number): void {
    this.metrics.totalClasses++;

    // Skip if it's an arbitrary value
    if (this.isArbitraryValue(className)) {
      this.validateArbitraryValue(className, line, column);
      this.metrics.arbitraryValues++;
      return;
    }

    // Check for deprecated classes
    if (this.isDeprecatedClass(className)) {
      this.metrics.deprecatedClasses++;
      const deprecationMessage = this.getDeprecationMessage(className);
      this.warnings.push({
        type: 'deprecated',
        message: `Deprecated class: ${className}. ${deprecationMessage}`,
        className,
        line,
        column
      });
      return;
    }

    // Check for responsive prefixes
    if (this.hasResponsivePrefix(className)) {
      this.metrics.responsiveClasses++;
      const baseClass = this.removeResponsivePrefix(className);
      if (!this.isValidBaseClass(baseClass)) {
        this.addClassError(className, line, column, 'Unknown responsive utility class');
        return;
      }
    }
    // Check for state modifiers
    else if (this.hasStateModifier(className)) {
      this.metrics.stateClasses++;
      const baseClass = this.removeStateModifier(className);
      if (!this.isValidBaseClass(baseClass)) {
        this.addClassError(className, line, column, 'Unknown state utility class');
        return;
      }
    }
    // Check if it's a valid Tailwind utility class
    else if (!this.isValidTailwindClass(className)) {
      // Check if it might be a custom class (starts with uppercase or contains custom patterns)
      if (this.isPotentialCustomClass(className) && !this.hasInvalidTailwindPattern(className)) {
        this.metrics.customClasses++;
        this.suggestions.push(`"${className}" appears to be a custom class. Ensure it's defined in your CSS.`);
      } else {
        this.addClassError(className, line, column, 'Unknown Tailwind utility class');
        return;
      }
    }

    this.metrics.validClasses++;
  }

  private isArbitraryValue(className: string): boolean {
    return className.includes('[') && className.includes(']');
  }

  private validateArbitraryValue(className: string, line: number, column: number): void {
    const arbitraryRegex = /^(\w+(?:-\w+)*)-\[([^\]]+)\]$/;
    const match = className.match(arbitraryRegex);
    
    if (!match) {
      this.errors.push({
        type: 'invalid-arbitrary',
        message: `Invalid arbitrary value syntax: ${className}`,
        className,
        line,
        column,
        severity: 'error'
      });
      this.metrics.invalidClasses++;
      return;
    }

    const [, property, value] = match;
    
    // Validate the property part
    if (!this.isValidArbitraryProperty(property)) {
      this.errors.push({
        type: 'invalid-arbitrary',
        message: `Invalid arbitrary value property: ${property}`,
        className,
        line,
        column,
        severity: 'error'
      });
      this.metrics.invalidClasses++;
      return;
    }

    // Validate the value part
    if (!this.isValidArbitraryValueSyntax(value)) {
      this.errors.push({
        type: 'invalid-arbitrary',
        message: `Invalid arbitrary value: ${value}`,
        className,
        line,
        column,
        severity: 'error'
      });
      this.metrics.invalidClasses++;
      return;
    }

    this.metrics.validClasses++;
  }

  private isValidArbitraryProperty(property: string): boolean {
    // Common arbitrary value prefixes
    const validPrefixes = [
      'w', 'h', 'min-w', 'max-w', 'min-h', 'max-h',
      'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me',
      'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe',
      'top', 'right', 'bottom', 'left', 'inset',
      'text', 'bg', 'border', 'ring', 'shadow',
      'rotate', 'scale', 'translate', 'skew',
      'gap', 'space-x', 'space-y',
      'grid-cols', 'grid-rows', 'col-span', 'row-span',
      'rounded', 'opacity', 'z'
    ];
    
    return validPrefixes.some(prefix => property === prefix || property.startsWith(prefix + '-'));
  }

  private isValidArbitraryValueSyntax(value: string): boolean {
    // Basic validation for arbitrary values
    if (value.length === 0) return false;
    
    // Check for balanced parentheses and quotes
    const openParens = (value.match(/\(/g) || []).length;
    const closeParens = (value.match(/\)/g) || []).length;
    const openQuotes = (value.match(/"/g) || []).length;
    const openSingleQuotes = (value.match(/'/g) || []).length;
    
    return openParens === closeParens && 
           openQuotes % 2 === 0 && 
           openSingleQuotes % 2 === 0;
  }

  private isDeprecatedClass(className: string): boolean {
    for (const [deprecatedPrefix] of DEPRECATED_CLASSES) {
      if (className.startsWith(deprecatedPrefix) || className === deprecatedPrefix) {
        return true;
      }
    }
    return false;
  }

  private getDeprecationMessage(className: string): string {
    for (const [deprecatedPrefix, message] of DEPRECATED_CLASSES) {
      if (className.startsWith(deprecatedPrefix) || className === deprecatedPrefix) {
        return message;
      }
    }
    return 'This class is deprecated in Tailwind CSS v3';
  }

  private hasResponsivePrefix(className: string): boolean {
    return RESPONSIVE_PREFIXES.some(prefix => className.startsWith(prefix));
  }

  private removeResponsivePrefix(className: string): string {
    for (const prefix of RESPONSIVE_PREFIXES) {
      if (className.startsWith(prefix)) {
        return className.substring(prefix.length);
      }
    }
    return className;
  }

  private hasStateModifier(className: string): boolean {
    return STATE_MODIFIERS.some(modifier => className.startsWith(modifier));
  }

  private removeStateModifier(className: string): string {
    for (const modifier of STATE_MODIFIERS) {
      if (className.startsWith(modifier)) {
        return className.substring(modifier.length);
      }
    }
    return className;
  }

  private isValidBaseClass(className: string): boolean {
    return this.isValidTailwindClass(className);
  }

  private isValidTailwindClass(className: string): boolean {
    return VALID_TAILWIND_CLASSES.has(className);
  }

  private isPotentialCustomClass(className: string): boolean {
    // Heuristics for detecting custom classes
    return /^[A-Z]/.test(className) ||   // Starts with uppercase
           className.includes('__') ||     // BEM-style
           className.includes('--') ||     // Custom modifier
           className.length > 30;          // Very long class names are likely custom
  }

  private hasInvalidTailwindPattern(className: string): boolean {
    // Check for patterns that should be considered invalid rather than custom
    return className.includes('_') ||     // Underscores are not valid in Tailwind
           /[^a-zA-Z0-9\-:\/\[\]\.]/g.test(className); // Invalid characters
  }

  private addClassError(className: string, line: number, column: number, message: string): void {
    this.errors.push({
      type: 'unknown-class',
      message: `${message}: ${className}`,
      className,
      line,
      column,
      severity: 'error'
    });
    this.metrics.invalidClasses++;
  }

  private analyzeClassUsage(classes: string[]): void {
    // Count different types of classes
    const responsiveCount = classes.filter(cls => this.hasResponsivePrefix(cls)).length;
    const stateCount = classes.filter(cls => this.hasStateModifier(cls)).length;
    const arbitraryCount = classes.filter(cls => this.isArbitraryValue(cls)).length;
    
    // Update metrics
    this.metrics.responsiveClasses = responsiveCount;
    this.metrics.stateClasses = stateCount;
    this.metrics.arbitraryValues = arbitraryCount;
  }

  private checkForDuplicates(classes: string[], line: number): void {
    const classCount = new Map<string, number>();
    
    classes.forEach(className => {
      classCount.set(className, (classCount.get(className) || 0) + 1);
    });
    
    for (const [className, count] of classCount) {
      if (count > 1) {
        this.warnings.push({
          type: 'redundant',
          message: `Duplicate class: ${className} (appears ${count} times)`,
          className,
          line,
          column: 1
        });
        this.metrics.duplicateClasses++;
      }
    }
  }

  private checkAccessibility(classes: string[], line: number): void {
    const hasTextColor = classes.some(cls => cls.startsWith('text-') && !cls.includes('text-xs') && !cls.includes('text-sm') && !cls.includes('text-base') && !cls.includes('text-lg') && !cls.includes('text-xl'));
    const hasBgColor = classes.some(cls => cls.startsWith('bg-'));
    const hasSmallText = classes.some(cls => cls === 'text-xs');
    const hasLowOpacity = classes.some(cls => cls.includes('opacity-') && (cls.includes('opacity-10') || cls.includes('opacity-20') || cls.includes('opacity-30')));
    
    if (hasTextColor && hasBgColor) {
      this.suggestions.push('Ensure sufficient color contrast between text and background colors');
    }
    
    if (hasSmallText) {
      this.warnings.push({
        type: 'accessibility',
        message: 'Very small text (text-xs) may not be accessible',
        className: 'text-xs',
        line,
        column: 1
      });
    }
    
    if (hasLowOpacity && hasTextColor) {
      this.warnings.push({
        type: 'accessibility',
        message: 'Low opacity text may not meet accessibility contrast requirements',
        className: classes.find(cls => cls.includes('opacity-')) || '',
        line,
        column: 1
      });
    }
  }

  private checkPerformance(classes: string[], line: number): void {
    // Check for excessive number of classes
    if (classes.length > 20) {
      this.warnings.push({
        type: 'performance',
        message: `Large number of classes (${classes.length}) may impact performance`,
        className: '',
        line,
        column: 1
      });
    }
    
    // Check for excessive arbitrary values
    const arbitraryCount = classes.filter(cls => this.isArbitraryValue(cls)).length;
    if (arbitraryCount > 5) {
      this.warnings.push({
        type: 'maintainability',
        message: `High number of arbitrary values (${arbitraryCount}) may indicate need for custom CSS`,
        className: '',
        line,
        column: 1
      });
    }
  }

  private resetMetrics(): void {
    this.metrics = {
      totalClasses: 0,
      validClasses: 0,
      invalidClasses: 0,
      arbitraryValues: 0,
      customClasses: 0,
      responsiveClasses: 0,
      stateClasses: 0,
      duplicateClasses: 0,
      deprecatedClasses: 0
    };
  }

  private calculateScore(): number {
    const errorWeight = 15;
    const warningWeight = 3; // Reduced warning weight
    const maxScore = 100;
    
    const deductions = (this.errors.length * errorWeight) + (this.warnings.length * warningWeight);
    return Math.max(0, maxScore - deductions);
  }

  // Utility methods for external use
  static isValidTailwindClass(className: string): boolean {
    const validator = new TailwindValidator();
    return validator.isValidTailwindClass(className);
  }

  static extractTailwindClasses(html: string): string[] {
    const classRegex = /class(?:Name)?=["']([^"']+)["']/gi;
    const classes: string[] = [];
    let match;
    
    while ((match = classRegex.exec(html)) !== null) {
      const classNames = match[1];
      classes.push(...classNames.split(/\s+/).filter(cls => cls.length > 0));
    }
    
    return classes;
  }

  static getDeprecatedClasses(): Map<string, string> {
    return new Map(DEPRECATED_CLASSES);
  }
}