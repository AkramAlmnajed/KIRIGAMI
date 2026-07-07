/**
 * Small filesystem helpers for the generation flow.
 */
import { existsSync, readdirSync, accessSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname, isAbsolute } from 'node:path';
import type { WizardAnswers } from '../types.js';

export type TargetState = 'missing' | 'empty' | 'nonempty';

/** ~/Desktop — or null when the machine has no Desktop folder. */
export function desktopDir(): string | null {
  const d = join(homedir(), 'Desktop');
  return existsSync(d) ? d : null;
}

/** Expand a leading ~ / ~/… to the home directory. */
export function expandUserPath(p: string): string {
  const t = p.trim();
  if (t === '~') return homedir();
  if (t.startsWith('~/')) return join(homedir(), t.slice(2));
  return t;
}

/**
 * The base directory a project folder will be created in, from the wizard's
 * location answer. Custom paths get ~-expansion and relative paths resolve
 * against the cwd. Used by BOTH the overwrite check and the writer, so the
 * two can never diverge.
 */
export function resolveBaseDir(
  answers: Pick<WizardAnswers, 'location' | 'customPath'>
): string {
  if (answers.location === 'desktop') {
    return desktopDir() ?? process.cwd();
  }
  if (answers.location === 'custom' && answers.customPath) {
    const expanded = expandUserPath(answers.customPath);
    return isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
  }
  return process.cwd();
}

/**
 * Pre-flight writability check for a (possibly not-yet-existing) directory:
 * walk up to the nearest EXISTING ancestor and test write access on it.
 * Returns an error message, or null when the path is usable.
 */
export function writabilityError(dir: string): string | null {
  let probe = dir;
  while (!existsSync(probe)) {
    const parent = dirname(probe);
    if (parent === probe) break; // filesystem root
    probe = parent;
  }
  try {
    accessSync(probe, constants.W_OK);
    return null;
  } catch {
    return `No write permission at ${probe}`;
  }
}

/** Abbreviate the home directory to ~ for display. */
export function tildify(p: string): string {
  const home = homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

/** Classify a target directory so the wizard can warn before overwriting. */
export function targetState(dir: string): TargetState {
  if (!existsSync(dir)) return 'missing';
  try {
    const entries = readdirSync(dir).filter((n) => n !== '.DS_Store');
    return entries.length === 0 ? 'empty' : 'nonempty';
  } catch {
    // If we can't read it, treat it as occupied so we err on the side of asking.
    return 'nonempty';
  }
}
