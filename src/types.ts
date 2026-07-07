/**
 * Shared types for the Kirigami CLI.
 */

/** The screen currently shown by the root router in app.tsx. */
export type Screen = 'menu' | 'create' | 'check' | 'analyze' | 'execute' | 'about';

/** Values emitted by the main menu selection. 'exit' quits the app. */
export type MenuAction = Screen | 'exit';

// --- Create New Project wizard --------------------------------------------

export type Framework = 'nextjs' | 'vite';
export type Styling = 'tailwind' | 'material-ui' | 'css-modules';
export type StateMgmt = 'zustand' | 'redux' | 'none';
export type PkgManager = 'npm' | 'pnpm' | 'yarn';
export type IconLib = 'fontawesome' | 'none';
export type Testing = 'vitest' | 'none';
export type I18n = 'react-i18next' | 'none';
export type Animations = 'framer-motion' | 'none';
export type ProjectLocation = 'cwd' | 'desktop' | 'custom';

/** The answers collected by the Create New Project wizard. */
export interface WizardAnswers {
  projectName: string;
  location: ProjectLocation;
  /** Raw custom path as typed (only meaningful when location === 'custom'). */
  customPath?: string;
  framework: Framework;
  styling: Styling;
  stateMgmt: StateMgmt;
  pkgManager: PkgManager;
  iconLib: IconLib;
  testing: Testing;
  i18n: I18n;
  animations: Animations;
}

/** Human-readable labels for each option value (used on the summary screen). */
export const LABELS = {
  framework: {
    nextjs: 'Next.js (App Router)',
    vite: 'React Vite',
  },
  styling: {
    tailwind: 'Tailwind CSS',
    'material-ui': 'Material UI',
    'css-modules': 'CSS Modules',
  },
  stateMgmt: {
    zustand: 'Zustand',
    redux: 'Redux Toolkit',
    none: 'None',
  },
  pkgManager: {
    npm: 'npm',
    pnpm: 'pnpm',
    yarn: 'yarn',
  },
  iconLib: {
    fontawesome: 'Font Awesome',
    none: 'None',
  },
  testing: {
    vitest: 'Vitest + Testing Library',
    none: 'None',
  },
  i18n: {
    'react-i18next': 'react-i18next',
    none: 'None',
  },
  animations: {
    'framer-motion': 'Framer Motion',
    none: 'None',
  },
} as const;
