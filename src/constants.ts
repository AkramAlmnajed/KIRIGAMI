/**
 * Shared constants for the Kirigami CLI: version, colors, and the
 * (non-removable) creator credit strings.
 */

// Read at build time from package.json so the version stays in one place.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

export const VERSION: string = pkg.version;

export const NAME = 'Kirigami';
export const TAGLINE = 'scaffold FSD-correct React/Next.js projects';

/** Matrix / hacker palette (+ one sparing gold accent — see Banner/Credit). */
export const COLORS = {
  primary: '#00FF41', // bright green
  accent: '#00E5FF', // cyan
  dim: '#2E7D32', // dimmed green for unselected items
  gold: '#C9A227', // Akram's portfolio gold — ONLY the katana fittings + signature
} as const;

/** Gradient stops used across the ASCII banner (green -> cyan). */
export const BANNER_GRADIENT = ['#00FF41', '#00E5FF'] as const;

/** Japanese subtitle shown under the banner art. */
export const SUBTITLE = '切り紙 (kirigami)';

/**
 * Creator credit. Rendered on every screen and again on success/exit.
 * This is intentionally centralized and always shown — no flag disables it.
 */
export const CREDIT = {
  name: 'Created by Akram Almnajed',
  url: 'github.com/AkramAlmnajed',
} as const;

export const GITHUB_URL = 'https://github.com/AkramAlmnajed';
export const REPO_URL = 'https://github.com/AkramAlmnajed/kirigami';
