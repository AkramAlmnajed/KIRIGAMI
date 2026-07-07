/**
 * Runs the bundled Steiger against a target folder and returns a structured
 * report. Steiger reads its config from the target's cwd (a Kirigami-generated
 * project ships a steiger.config.ts); with no config it falls back to its
 * defaults. We analyze `<target>/src` when present, else the folder itself.
 */
import { execa } from 'execa';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface SteigerReport {
  ok: boolean;
  output: string;
  analyzedPath: string;
  error?: string;
}

/** Locate the bundled steiger CLI (dist/cli.mjs) relative to this module. */
function steigerCli(): string | null {
  // Compiled path: <toolroot>/dist/lib/steiger.js → ../../node_modules/...
  const candidate = fileURLToPath(
    new URL('../../node_modules/steiger/dist/cli.mjs', import.meta.url)
  );
  return existsSync(candidate) ? candidate : null;
}

export async function runSteiger(targetDir: string): Promise<SteigerReport> {
  const abs = resolve(targetDir);
  if (!existsSync(abs)) {
    return { ok: false, output: '', analyzedPath: abs, error: `Folder not found: ${abs}` };
  }
  const arg = existsSync(join(abs, 'src')) ? 'src' : '.';
  const analyzedPath = join(abs, arg);

  const cli = steigerCli();
  if (!cli) {
    return {
      ok: false,
      output: '',
      analyzedPath,
      error: 'Could not locate the bundled Steiger. Try re-running ./install.sh.',
    };
  }

  try {
    const res = await execa('node', [cli, arg], {
      cwd: abs,
      reject: false,
      all: true,
    });
    const output = (res.all ?? `${res.stdout ?? ''}${res.stderr ?? ''}`).trim();
    const ok = /No problems found/.test(output);
    return { ok, output, analyzedPath };
  } catch (e) {
    return {
      ok: false,
      output: '',
      analyzedPath,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
