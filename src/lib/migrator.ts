/**
 * FSD Migration engine (Phase 19 Part B) — REAL file moves, gated by the
 * clean-git precondition and confidence, executed with ts-morph.
 *
 * Proven behaviours this encodes (each tested on the analyzer fixtures):
 *  - ts-morph `.move()` rewrites RELATIVE importers natively.
 *  - PATH-ALIAS importers are NOT rewritten by `.move()`; we fix them with a
 *    resolve-before / `setModuleSpecifier`-after AST pass (no text replacement).
 *  - Barrel re-exports are updated on move; consumers of the barrel path aren't.
 *  - Co-located non-source siblings (`.module.css`, `.test.tsx`, …) are invisible
 *    to ts-morph, so we sweep them explicitly and verify by filesystem check.
 *  - Two files targeting one destination make ts-morph THROW — so we detect
 *    collisions in the plan phase and never execute them.
 */
import { execSync } from 'node:child_process';
import { join, basename, dirname, relative } from 'node:path';
import { readdirSync, mkdirSync, renameSync } from 'node:fs';
import { Project, SyntaxKind, type SourceFile } from 'ts-morph';
import { analyzeProject } from './analyzer.js';

export interface SiblingSpec {
  rel: string;
  isSource: boolean;
}
export interface MovePlan {
  rel: string;
  dest: string;
  layer: string;
  slice?: string;
  segment?: string;
  conf: 'high' | 'medium';
  siblings: SiblingSpec[];
}
export interface Collision {
  dest: string;
  sources: string[];
}
export interface MigrationPlan {
  target: string;
  eligible: MovePlan[];
  reviewBySlice: { slice: string; files: MovePlan[] }[];
  neverMove: { rel: string; why: string }[];
  collisions: Collision[];
}

// ── Precondition (runs BEFORE the slow analysis) ────────────────
export function checkPrecondition(target: string): { ok: boolean; reason?: string } {
  let isRepo = false;
  try {
    isRepo =
      execSync(`git -C "${target}" rev-parse --is-inside-work-tree`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim() === 'true';
  } catch {
    isRepo = false;
  }
  if (!isRepo) return { ok: false, reason: 'not a git repository' };
  const dirty = execSync(`git -C "${target}" status --porcelain`, { encoding: 'utf8' }).trim();
  if (dirty) return { ok: false, reason: `${dirty.split('\n').length} uncommitted change(s)` };
  return { ok: true };
}

export function refusalMessage(reason: string): string {
  return [
    '  ✖  Cannot run FSD migration — this needs a CLEAN git repository.',
    '',
    '     This feature moves and rewrites real files. Its entire safety net is git:',
    '     if anything looks wrong afterward, `git checkout .` restores everything',
    '     instantly — but only because nothing else was uncommitted when it started.',
    '',
    `     Blocked because: ${reason}.`,
    '',
    '     Commit or stash your changes (or `git init` + first commit), then re-run',
    '     on a clean tree. There is no override — this is the safety model.',
  ].join('\n');
}

// ── Shape helpers (segment inference) ───────────────────────────
function hasJSX(sf: SourceFile | undefined): boolean {
  return (
    !!sf &&
    sf
      .getDescendants()
      .some((d) =>
        [SyntaxKind.JsxElement, SyntaxKind.JsxSelfClosingElement, SyntaxKind.JsxFragment].includes(d.getKind())
      )
  );
}
function typesOnly(sf: SourceFile | undefined): boolean {
  if (!sf) return false;
  const decls = [...sf.getExportedDeclarations().values()].flat();
  return (
    decls.length > 0 &&
    decls.every((d) =>
      [SyntaxKind.InterfaceDeclaration, SyntaxKind.TypeAliasDeclaration].includes(d.getKind())
    )
  );
}
const API_RE = /(service|api|http|client|fetch|request|logger)/i;

function segmentOf(sf: SourceFile | undefined, layer: string, slice?: string, file = ''): string | undefined {
  if (layer === 'app') return undefined;
  if (layer === 'shared') {
    if (hasJSX(sf) || slice === 'ui') return 'ui';
    if (API_RE.test(file)) return 'api';
    return 'lib';
  }
  if (hasJSX(sf)) return 'ui';
  if (typesOnly(sf)) return 'model';
  if (API_RE.test(file)) return 'api';
  return 'lib';
}

function destOf(m: { rel: string; layer: string; slice?: string; segment?: string }): string {
  const file = basename(m.rel);
  if (m.layer === 'app') return `src/app/${file}`;
  if (m.layer === 'shared') return `src/shared/${m.segment}/${file}`;
  return `src/${m.layer}/${m.slice}/${m.segment}/${file}`;
}

function siblingsOf(target: string, rel: string): SiblingSpec[] {
  const dir = join(target, dirname(rel));
  const self = basename(rel);
  const stem = self.replace(/\.[^.]+$/, '').split('.')[0]; // Button  (from Button.tsx / Button.test.tsx / Button.module.css)
  const out: SiblingSpec[] = [];
  for (const name of readdirSync(dir)) {
    if (name === self) continue;
    if (name === stem || name.startsWith(stem + '.'))
      out.push({ rel: join(dirname(rel), name), isSource: /\.(tsx?|jsx?)$/.test(name) });
  }
  return out;
}

export function barrelFor(m: MovePlan): string | null {
  if (m.layer === 'app') return null;
  return m.layer === 'shared'
    ? `src/shared/${m.segment}/index.ts`
    : `src/${m.layer}/${m.slice}/index.ts`;
}

// ── Plan ────────────────────────────────────────────────────────
export function buildPlan(target: string): MigrationPlan {
  const a = analyzeProject(target);
  const quarantine = new Set<string>();
  for (const v of a.violations) {
    quarantine.add(v.a);
    quarantine.add(v.b);
  }
  for (const c of a.cycles) for (const p of c) quarantine.add(p);

  const project = new Project({ tsConfigFilePath: join(target, 'tsconfig.json') });
  const mk = (f: { rel: string; layer: string; slice?: string; conf: string }): MovePlan => {
    const sf = project.getSourceFile(join(target, f.rel));
    const segment = segmentOf(sf, f.layer, f.slice, basename(f.rel));
    const base = { rel: f.rel, layer: f.layer, slice: f.slice, segment };
    return { ...base, dest: destOf(base), conf: f.conf as 'high' | 'medium', siblings: siblingsOf(target, f.rel) };
  };

  // Test/spec/stories files are never independent move targets — they travel
  // with their component as co-located siblings, so exclude them here to avoid
  // double-handling (once as a sibling, once as its own plan entry).
  const isAux = (rel: string) => /\.(test|spec|stories)\.[jt]sx?$/.test(rel);
  const movable = a.files.filter((f) => !isAux(f.rel));

  const eligible = movable.filter((f) => f.conf === 'high' && f.layer !== 'uncertain' && !quarantine.has(f.rel)).map(mk);
  const medium = movable.filter((f) => f.conf === 'medium' && !quarantine.has(f.rel)).map(mk);
  const bySlice = new Map<string, MovePlan[]>();
  for (const m of medium) {
    const k = `${m.layer}/${m.slice ?? ''}`;
    (bySlice.get(k) ?? bySlice.set(k, []).get(k)!).push(m);
  }
  const reviewBySlice = [...bySlice.entries()].map(([slice, files]) => ({ slice, files }));

  const neverMove = movable
    .filter((f) => f.layer === 'uncertain' || quarantine.has(f.rel))
    .map((f) => ({
      rel: f.rel,
      why: f.layer === 'uncertain' ? 'uncertain — needs a human decision' : 'in a flagged violation/cycle',
    }));

  // Collision detection across every final path (primary + siblings) of every
  // file that COULD move (eligible + all medium). Any duplicate target is
  // surfaced here and must be resolved before execution — never executed blind.
  const destMap = new Map<string, string[]>();
  for (const m of [...eligible, ...medium]) {
    const paths: [string, string][] = [[m.dest, m.rel]];
    for (const s of m.siblings) paths.push([join(dirname(m.dest), basename(s.rel)), `${m.rel} → sibling ${basename(s.rel)}`]);
    for (const [p, src] of paths) (destMap.get(p) ?? destMap.set(p, []).get(p)!).push(src);
  }
  const collisions = [...destMap.entries()]
    .filter(([, srcs]) => srcs.length > 1)
    .map(([dest, sources]) => ({ dest, sources }));

  // Safety: any file whose destination collides is pulled OUT of the auto-move
  // set (and out of grouped review) — it needs a human to rename/re-home it
  // first. This is what stops ts-morph's overwrite-throw from ever firing.
  const collidingDests = new Set(collisions.map((c) => c.dest));
  const safe = (m: MovePlan) => !collidingDests.has(m.dest);
  const safeReview = reviewBySlice
    .map((g) => ({ slice: g.slice, files: g.files.filter(safe) }))
    .filter((g) => g.files.length > 0);

  return { target, eligible: eligible.filter(safe), reviewBySlice: safeReview, neverMove, collisions };
}

// ── Alias recomputation from tsconfig paths ─────────────────────
function makeAliaser(opts: { paths?: Record<string, string[]> }): (newRel: string) => string | null {
  const maps: { prefix: string; base: string }[] = [];
  for (const [k, arr] of Object.entries(opts.paths ?? {})) {
    if (!k.endsWith('/*')) continue;
    maps.push({ prefix: k.replace(/\/\*$/, ''), base: (arr[0] ?? '').replace(/\/\*$/, '').replace(/^\.\//, '') });
  }
  return (newRel: string) => {
    const noExt = newRel.replace(/\.(tsx?|jsx?)$/, '');
    for (const m of maps)
      if (noExt === m.base || noExt.startsWith(m.base + '/'))
        return m.prefix + '/' + noExt.slice(m.base.length).replace(/^\//, '');
    return null;
  };
}

// ── Execute ─────────────────────────────────────────────────────
export interface ExecResult {
  moved: number;
  aliasFixed: number;
  siblingsMoved: number;
  barrelsCreated: number;
}
export function executeMigration(target: string, moves: MovePlan[]): ExecResult {
  const project = new Project({ tsConfigFilePath: join(target, 'tsconfig.json') });
  const aliasOf = makeAliaser(project.getCompilerOptions() as { paths?: Record<string, string[]> });

  const planByOld = new Map<string, MovePlan>(); // oldAbs -> MovePlan
  for (const m of moves) planByOld.set(join(target, m.rel), m);

  // Record EVERY importer (relative + alias) that resolves to a moved file,
  // BEFORE the move (old paths still resolve). We re-point them at the target's
  // public API (the barrel), not the deep file, so no consumer sidesteps it.
  const importers: {
    d: import('ts-morph').ImportDeclaration | import('ts-morph').ExportDeclaration;
    oldAbs: string;
  }[] = [];
  for (const sf of project.getSourceFiles())
    for (const d of [...sf.getImportDeclarations(), ...sf.getExportDeclarations()]) {
      if (!d.getModuleSpecifierValue()) continue;
      const tgt = d.getModuleSpecifierSourceFile();
      if (tgt && planByOld.has(tgt.getFilePath())) importers.push({ d, oldAbs: tgt.getFilePath() });
    }

  // Move primary + source siblings via ts-morph; queue non-source siblings for fs.
  const fsMoves: { from: string; to: string }[] = [];
  let siblingsMoved = 0;
  for (const m of moves) {
    const destDir = dirname(join(target, m.dest));
    project.getSourceFileOrThrow(join(target, m.rel)).move(join(target, m.dest));
    for (const s of m.siblings) {
      const to = join(destDir, basename(s.rel));
      if (s.isSource) project.getSourceFileOrThrow(join(target, s.rel)).move(to);
      else fsMoves.push({ from: join(target, s.rel), to });
      siblingsMoved++;
    }
  }

  // One barrel per slice (per shared-segment) re-exporting what moved into it.
  // (The barrel re-exports its own segment via a deep path — that's the public
  // API being defined, not a sidestep.)
  const barrels = new Map<string, string[]>();
  for (const m of moves) {
    const barrel = barrelFor(m);
    if (!barrel) continue;
    const relToFile =
      './' + relative(dirname(join(target, barrel)), join(target, m.dest)).replace(/\.(tsx?|jsx?)$/, '');
    (barrels.get(barrel) ?? barrels.set(barrel, []).get(barrel)!).push(`export * from '${relToFile}';`);
  }
  for (const [barrel, lines] of barrels)
    project.createSourceFile(join(target, barrel), [...new Set(lines)].sort().join('\n') + '\n', { overwrite: true });

  // Re-point importers at the public API. app-layer files have no barrel, so
  // those keep a direct path. Same-slice importers are left internal.
  let rewired = 0;
  for (const { d, oldAbs } of importers) {
    const tgtPlan = planByOld.get(oldAbs)!;
    const barrel = barrelFor(tgtPlan);
    const publicRel = barrel ? dirname(barrel) : tgtPlan.dest.replace(/\.(tsx?|jsx?)$/, '');
    const publicAbs = join(target, publicRel);
    const importerDir = d.getSourceFile().getDirectoryPath();
    if (importerDir === publicAbs || importerDir.startsWith(publicAbs + '/')) continue; // same slice → internal
    let spec = aliasOf(publicRel);
    if (!spec) {
      let r = relative(importerDir, publicAbs);
      spec = r.startsWith('.') ? r : './' + r;
    }
    d.setModuleSpecifier(spec);
    rewired++;
  }

  project.saveSync();

  for (const { from, to } of fsMoves) {
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  }
  return { moved: moves.length, aliasFixed: rewired, siblingsMoved, barrelsCreated: barrels.size };
}
