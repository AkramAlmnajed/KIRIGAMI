/**
 * Internal types for the generation engine. A project is planned as a flat list
 * of FileSpec (relative path + contents); the writer then materializes them.
 */
import type { WizardAnswers, Framework } from '../../types.js';

export interface FileSpec {
  /** Path relative to the project root, POSIX-style. */
  path: string;
  /** File contents. */
  contents: string;
}

/**
 * Framework-derived layout config. The FSD "pages" layer is named differently
 * per framework (see Steiger findings): Next uses `views` (to avoid the
 * `src/pages` Next Pages-Router collision), Vite uses canonical `pages`.
 */
export interface LayerConfig {
  pagesDir: 'views' | 'pages';
  pagesAlias: '@views' | '@pages';
}

export function layerConfig(framework: Framework): LayerConfig {
  return framework === 'nextjs'
    ? { pagesDir: 'views', pagesAlias: '@views' }
    : { pagesDir: 'pages', pagesAlias: '@pages' };
}

/** The six FSD layers in import-hierarchy order (highest first). */
export const FSD_LAYERS = [
  'app',
  'pages', // display name; actual dir is pagesDir
  'widgets',
  'features',
  'entities',
  'shared',
] as const;

export type PlanInput = WizardAnswers;
