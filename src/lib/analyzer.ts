/**
 * FSD Migration Analyzer (read-only). Parses a target project with ts-morph,
 * builds a resolved import graph (honoring tsconfig paths/aliases — real AST,
 * not regex), classifies each file into a suggested FSD layer with a confidence
 * and one-line reason, and surfaces pre-existing architectural problems
 * (upward imports + circular dependencies) that a mechanical file-move can't fix.
 *
 * This module never writes anything. It returns the markdown report as a
 * string; the caller (the screen) decides whether/where to write it.
 */
import { Project, SyntaxKind } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import { relative, basename, extname, sep, join } from 'node:path';
import { existsSync } from 'node:fs';

export interface Suggestion {
  layer: string;
  slice?: string;
  conf: 'high' | 'medium' | 'low';
  reason: string;
}
export interface FileSuggestion extends Suggestion {
  rel: string;
}
export interface Violation {
  a: string;
  b: string;
  la: string;
  lb: string;
}
export interface AnalyzeResult {
  target: string;
  fileCount: number;
  wide: number;
  files: FileSuggestion[];
  layerCounts: Record<string, number>;
  confidence: { high: number; medium: number; low: number };
  violations: Violation[];
  cycles: string[][];
  report: string;
  reportFileName: string;
}

interface Rec {
  f: SourceFile;
  path: string;
  rel: string;
  name: string;
  segs: string[];
  out: Set<string>;
  external: Set<string>;
  in: number;
  hasJSX: boolean;
  exportsHook: boolean;
  hasType: boolean;
  typesOnly: boolean;
}

const LAYER_ORDER = ['app', 'pages', 'widgets', 'features', 'entities', 'shared', 'uncertain'];
const RANK: Record<string, number> = {
  app: 5, pages: 4, widgets: 3, features: 2, entities: 1, shared: 0, uncertain: -1,
};
const GENERIC =
  /^(cn|clsx|classnames|button|input|modal|spinner|icon|tooltip|layout|badge|card|dialog|theme|styles?|format\w*|money|currency|date|time|utils?|helpers?|guard|debounce|throttle)$/i;
const INFRA = /^(api|apiclient|http|httpclient|client|fetch|request|logger|log|config|constants?|env)$/i;
const ACTION =
  /^(login|logout|signin|signup|register|auth|search|checkout|cart|addto\w*|filter|sort|submit|create|edit|update|delete|remove|upload|download|pay|subscribe|toggle|fetch)\w*/i;

export const REPORT_FILE_NAME = 'FSD-MIGRATION-REPORT.md';

export function analyzeProject(target: string): AnalyzeResult {
  const tsConfig = existsSync(join(target, 'tsconfig.json'))
    ? join(target, 'tsconfig.json')
    : undefined;
  const project = tsConfig
    ? new Project({ tsConfigFilePath: tsConfig })
    : new Project({ compilerOptions: { allowJs: true, jsx: 4 } });
  if (!tsConfig) project.addSourceFilesAtPaths(`${target}/**/*.{ts,tsx,js,jsx}`);

  const files = project.getSourceFiles().filter((f) => {
    const p = f.getFilePath();
    return (
      p.startsWith(target) &&
      !p.includes('/node_modules/') &&
      !p.endsWith('.d.ts') &&
      !/\.(test|spec)\.[tj]sx?$/.test(p)
    );
  });

  const relOf = (f: SourceFile): string => relative(target, f.getFilePath());
  const byPath = new Map(files.map((f) => [f.getFilePath(), f]));
  const rec = new Map<string, Rec>();
  for (const f of files) {
    const p = f.getFilePath();
    rec.set(p, {
      f, path: p, rel: relOf(f), name: basename(p, extname(p)),
      segs: relOf(f).split(sep), out: new Set(), external: new Set(),
      in: 0, hasJSX: false, exportsHook: false, hasType: false, typesOnly: false,
    });
  }
  const inCount = new Map(files.map((f) => [f.getFilePath(), 0]));

  for (const f of files) {
    const r = rec.get(f.getFilePath())!;
    const decls = [...f.getImportDeclarations(), ...f.getExportDeclarations()];
    for (const d of decls) {
      const spec = d.getModuleSpecifierValue();
      if (!spec) continue;
      let resolved: SourceFile | undefined;
      try {
        resolved = d.getModuleSpecifierSourceFile();
      } catch {
        resolved = undefined;
      }
      if (resolved && byPath.has(resolved.getFilePath())) {
        const rp = resolved.getFilePath();
        if (rp !== f.getFilePath()) {
          r.out.add(rp);
          inCount.set(rp, (inCount.get(rp) ?? 0) + 1);
        }
      } else if (!/^[./]/.test(spec)) {
        r.external.add(spec.split('/')[0]);
      }
    }
    r.hasJSX =
      f.getDescendantsOfKind(SyntaxKind.JsxElement).length +
        f.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length +
        f.getDescendantsOfKind(SyntaxKind.JsxFragment).length >
      0;
    let exp: Map<string, { getKindName?: () => string }[]>;
    try {
      exp = f.getExportedDeclarations() as unknown as Map<string, { getKindName?: () => string }[]>;
    } catch {
      exp = new Map();
    }
    const names = [...exp.keys()];
    r.exportsHook = names.some((n) => /^use[A-Z]/.test(n));
    const kinds = [...exp.values()].flat().map((d) => d.getKindName?.() ?? '');
    r.typesOnly = kinds.length > 0 && kinds.every((k) => /Interface|TypeAlias|Enum/.test(k));
    r.hasType = kinds.some((k) => /Interface|TypeAlias|Enum/.test(k));
  }
  for (const [p, n] of inCount) rec.get(p)!.in = n;

  const ins = [...inCount.values()].sort((a, b) => a - b);
  const q75 = ins[Math.floor(ins.length * 0.75)] ?? 0;
  const WIDE = Math.max(3, q75);

  const inSeg = (r: Rec, ...names: string[]): boolean =>
    r.segs.some((s) => names.includes(s.toLowerCase()));
  const sliceName = (r: Rec): string => {
    let n = r.name
      .replace(/^use(?=[A-Z])/, '')
      .replace(
        /(Container|Component|Widget|Service|Store|Model|Route|Page|Screen|View|Form|Card|Row|Item|Avatar|List|Bar)$/i,
        ''
      );
    n = n || r.name;
    return n.charAt(0).toLowerCase() + n.slice(1);
  };

  function classify(r: Rec): Suggestion | null {
    const gen = GENERIC.test(r.name);
    const isEntry = /^(app|index|main|root|routes)$/i.test(r.name) && r.in === 0;
    if (isEntry && r.out.size >= 1)
      return { layer: 'app', conf: 'high', reason: 'entry/root module that wires the app together (imported by nothing)' };

    const routeSeg = inSeg(r, 'pages', 'routes', 'screens', 'app');
    const routeName = /(Page|Route|Screen|View)$/.test(r.name);
    if (r.hasJSX && (routeSeg || routeName)) {
      if (routeSeg && routeName)
        return { layer: 'pages', slice: sliceName(r), conf: 'high', reason: `in a routing folder (${r.segs.at(-2)}/) and named like a route` };
      if (routeSeg)
        return { layer: 'pages', slice: sliceName(r), conf: 'high', reason: `lives in a routing folder (${r.segs.at(-2)}/)` };
      return { layer: 'pages', slice: sliceName(r), conf: 'medium', reason: `named like a route ("${r.name}") though not in a routing folder` };
    }

    if (r.typesOnly)
      return gen
        ? { layer: 'shared', slice: 'types', conf: 'medium', reason: 'exports only generic types (no business noun)' }
        : { layer: 'entities', slice: sliceName(r), conf: 'high', reason: 'exports only types/interfaces — a business data shape' };

    if (INFRA.test(r.name))
      return { layer: 'shared', slice: sliceName(r), conf: r.out.size ? 'medium' : 'high', reason: `generic infrastructure/client ("${r.name}")${r.out.size ? ' — note its internal imports (flagged below)' : ''}` };

    if (r.hasJSX && gen)
      return { layer: 'shared', slice: 'ui', conf: r.in >= 2 ? 'high' : 'medium', reason: `generic UI primitive ("${r.name}") — belongs in the shared UI kit` };

    const svcName = /(Service|Store|Repository|Gateway)$/.test(r.name) || inSeg(r, 'services', 'features', 'modules');
    if (!r.hasJSX && r.hasType && !gen && !ACTION.test(r.name) && !svcName)
      return { layer: 'entities', slice: sliceName(r), conf: 'medium', reason: `a non-UI business model built around a type/interface ("${r.name}")` };

    if (r.out.size === 0 && r.in >= WIDE)
      return { layer: 'shared', slice: sliceName(r), conf: 'high', reason: `imported by ${r.in} modules, imports nothing internal — a leaf utility` };
    if (r.out.size === 0 && (gen || r.exportsHook || inSeg(r, 'utils', 'lib', 'helpers', 'shared', 'common')))
      return { layer: 'shared', slice: sliceName(r), conf: r.in >= 2 ? 'high' : 'medium', reason: `no internal dependencies${gen ? ', generic/business-agnostic name' : ''}${r.exportsHook ? ', exports a reusable hook' : ''}` };

    const entityRender = /(Card|Row|Item|Avatar|Badge|Tag|Chip)$/.test(r.name);
    if (r.hasJSX && entityRender && !gen)
      return { layer: 'entities', slice: sliceName(r), conf: 'medium', reason: `renders a single business object ("${r.name}"), imports mostly shared` };

    const formish = /(Form|Wizard|Dialog|Flow)$/.test(r.name);
    if (ACTION.test(r.name) || (r.exportsHook && /login|auth|search|checkout|cart/i.test(r.name)))
      return { layer: 'features', slice: sliceName(r), conf: 'medium', reason: `name reads as a user action ("${r.name}") — one delivered capability` };
    if (svcName && r.out.size >= 1)
      return { layer: 'features', slice: sliceName(r), conf: 'medium', reason: `service/domain module implementing business logic (imports ${r.out.size} modules)` };
    if (formish && r.hasJSX)
      return { layer: 'features', slice: sliceName(r), conf: 'medium', reason: `interactive form ("${r.name}") — a user-facing capability` };

    return null;
  }

  const result = new Map<string, Suggestion>();
  for (const r of rec.values()) {
    const c = classify(r);
    if (c) result.set(r.path, c);
  }
  // widgets: iterate to a fixed point
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rec.values()) {
      if (result.has(r.path) || !r.hasJSX) continue;
      const composed = [...r.out].filter((o) =>
        ['features', 'entities', 'widgets'].includes(result.get(o)?.layer ?? '')
      );
      if (composed.length >= 2) {
        result.set(r.path, { layer: 'widgets', slice: sliceName(r), conf: 'medium', reason: `composes ${composed.length} feature/entity modules into a larger UI block` });
        changed = true;
      }
    }
  }
  for (const r of rec.values()) {
    if (result.has(r.path)) continue;
    let guess = 'shared';
    let why = 'weak signals';
    if (r.hasJSX && r.out.size >= 1) { guess = 'widgets'; why = 'renders UI and imports other modules, but no clear compose/capability signal'; }
    else if (r.hasJSX) { guess = 'entities'; why = 'renders UI with few dependencies'; }
    result.set(r.path, { layer: 'uncertain', slice: guess, conf: 'low', reason: `does not clearly fit a layer — ${why} (nearest guess: ${guess})` });
  }

  // ---- architectural findings ----
  const violations: Violation[] = [];
  for (const r of rec.values()) {
    const from = result.get(r.path)!;
    for (const o of r.out) {
      const to = result.get(o)!;
      if (from.layer === 'uncertain' || to.layer === 'uncertain') continue;
      if (RANK[from.layer] < RANK[to.layer])
        violations.push({ a: r.rel, b: rec.get(o)!.rel, la: from.layer, lb: to.layer });
    }
  }
  // cycles (Tarjan SCC)
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let counter = 0;
  const sccs: string[][] = [];
  const strongconnect = (v: string): void => {
    idx.set(v, counter); low.set(v, counter); counter++; stack.push(v); onStack.add(v);
    for (const w of rec.get(v)!.out) {
      if (!idx.has(w)) { strongconnect(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      let w: string;
      do { w = stack.pop()!; onStack.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1) sccs.push(comp);
    }
  };
  for (const f of files) if (!idx.has(f.getFilePath())) strongconnect(f.getFilePath());

  // ---- tallies ----
  const layerCounts: Record<string, number> = {};
  const confidence = { high: 0, medium: 0, low: 0 };
  const fileSuggestions: FileSuggestion[] = [];
  for (const r of rec.values()) {
    const c = result.get(r.path)!;
    layerCounts[c.layer] = (layerCounts[c.layer] ?? 0) + 1;
    confidence[c.conf]++;
    fileSuggestions.push({ rel: r.rel, ...c });
  }

  const report = renderReport({
    target, fileCount: files.length, wide: WIDE, files: fileSuggestions,
    layerCounts, confidence, violations,
    cycles: sccs.map((c) => c.map((p) => relative(target, p))),
  });

  return {
    target, fileCount: files.length, wide: WIDE, files: fileSuggestions,
    layerCounts, confidence, violations,
    cycles: sccs.map((c) => c.map((p) => relative(target, p))),
    report, reportFileName: REPORT_FILE_NAME,
  };
}

/** Formatting only — all inputs come verbatim from analyzeProject(); this
 * function renders them and computes nothing about classification. */
function renderReport(d: Omit<AnalyzeResult, 'report' | 'reportFileName'>): string {
  const { target, fileCount, wide, files, layerCounts, confidence, violations, cycles } = d;
  const project = target.split('/').filter(Boolean).at(-1) || target;
  const date = new Date().toISOString().slice(0, 10);
  // conf 'low' is assigned only to unplaceable files (the `uncertain` layer),
  // so labelling it "uncertain" here is exact — same number, clearer word.
  const CONF: Record<string, string> = { high: '🟢 high', medium: '🟡 medium', low: '⚪ uncertain' };
  const clean = violations.length === 0 && cycles.length === 0;
  const uncertainCount = layerCounts['uncertain'] ?? 0;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  let md = `# ◈ FSD Migration Report\n\n`;
  md += `**Project:** \`${project}\` &nbsp;·&nbsp; **Analyzed:** ${date} &nbsp;·&nbsp; _generated by Kirigami's FSD Migration Analyzer_\n\n`;
  md += `> **◈ Read-only report.** No files in this project were moved, renamed, or modified.\n`;
  md += `> Every suggestion is a *heuristic* from static import-graph analysis — review each row before acting.\n\n`;

  // Executive summary — the whole story before anyone scrolls.
  md += `## Executive summary\n\n`;
  md += `| | |\n|---|---|\n`;
  md += `| **Files analyzed** | ${fileCount} |\n`;
  md += `| **Confidence** | ${confidence.high} high · ${confidence.medium} medium · ${confidence.low} uncertain |\n`;
  md += `| **Architectural problems** | ${
    clean
      ? 'none detected ✅'
      : `${plural(violations.length, 'upward import', 'upward imports')} · ${plural(cycles.length, 'circular dependency', 'circular dependencies')} ⚠️`
  } |\n\n`;
  md += clean
    ? `A clean, mechanical file-move migration looks **feasible** — no upward imports or cycles were found on the suggested mapping.\n\n`
    : `A purely mechanical file-move migration is **not** possible yet — resolve the **Architectural problems** below first.\n\n`;

  // How to read this.
  md += `## How to read this\n\n`;
  md += `Confidence is how sure the analyzer is of a file's **placement** — not a judgement of code quality:\n\n`;
  md += `- **🟢 high** — the file's shape strongly matches this layer.\n`;
  md += `- **🟡 medium** — a plausible fit on a weaker signal; sanity-check it.\n`;
  md += `- **⚪ uncertain** — couldn't be placed confidently; needs a human decision (listed under its own heading with the analyzer's nearest guess).\n\n`;
  md += `"Widely imported" means a module pulled in by ≥ ${wide} others — a signal it belongs in \`shared\`.\n\n`;

  md += `## Suggested layer distribution\n\n| Layer | Files |\n|---|---|\n`;
  for (const l of LAYER_ORDER)
    if (layerCounts[l]) md += `| \`${l}\`${l === 'uncertain' ? ' ⚠️' : ''} | ${layerCounts[l]} |\n`;

  md += `\n## Per-file suggestions\n`;
  for (const l of LAYER_ORDER) {
    const rows = files.filter((f) => f.layer === l).sort((a, b) => a.rel.localeCompare(b.rel));
    if (!rows.length) continue;
    md += `\n### \`src/${l}\`${l === 'uncertain' ? ' — needs a human decision' : ''}\n\n`;
    md += `| current file | suggested | confidence | why |\n|---|---|---|---|\n`;
    for (const r of rows) {
      const dest = l === 'uncertain' ? '—' : r.slice ? `\`${l}/${r.slice}\`` : `\`${l}\``;
      md += `| \`${r.rel}\` | ${dest} | ${CONF[r.conf] ?? r.conf} | ${r.reason} |\n`;
    }
  }

  // Architectural problems — visually distinct callout, the part to notice.
  if (clean) {
    md += `\n## ✅ Architectural problems\n\n`;
    md += `> **None detected on the suggested mapping.** The layer graph is acyclic and no lower layer imports a higher one — the migration can be a straight file move.\n`;
  } else {
    md += `\n## ⚠️ Architectural problems — refactoring, not just moving\n\n`;
    md += `> **Read this first.** These are *pre-existing* issues and will **not** be fixed by relocating files — the dependencies themselves have to change.\n>\n`;
    if (violations.length) {
      md += `> **Upward imports** (a lower layer importing a higher one — forbidden in FSD):\n>\n`;
      for (const v of violations)
        md += `> - \`${v.a}\` (→ ${v.la}) imports \`${v.b}\` (→ ${v.lb}) — a **${v.la} → ${v.lb}** import goes the wrong way.\n`;
      md += `>\n`;
    }
    if (cycles.length) {
      md += `> **Circular dependencies** (FSD requires an acyclic layer graph):\n>\n`;
      for (const c of cycles) md += `> - ${c.map((p) => `\`${p}\``).join(' ↔ ')}\n`;
      md += `>\n`;
    }
    md += `> Break these cycles / invert these imports **before or during** the move — a clean mechanical migration isn't possible until they're addressed.\n`;
  }

  // Next steps.
  md += `\n## Next steps\n\n`;
  const steps: string[] = [];
  steps.push(`Move the **🟢 high-confidence** files first — they're the safest.`);
  steps.push(`Sanity-check each **🟡 medium** suggestion against its "why" before moving.`);
  if (uncertainCount)
    steps.push(`Decide a home for the **⚪ uncertain** file${uncertainCount === 1 ? '' : 's'} — the analyzer's nearest guess is in the table.`);
  if (!clean) steps.push(`Resolve the **architectural problems** above — they gate a clean migration.`);
  steps.push(`Re-run **Analyze for FSD Migration** to confirm the graph is clean, then add \`steiger\` to keep it that way.`);
  steps.forEach((s, i) => (md += `${i + 1}. ${s}\n`));

  md += `\n---\n_◈ Generated by Kirigami's FSD Migration Analyzer — read-only, heuristic, not authoritative._\n`;
  return md;
}
