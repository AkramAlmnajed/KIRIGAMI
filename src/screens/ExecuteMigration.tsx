/**
 * "Execute FSD Migration" — REAL file moves. Hard-gated by a clean git tree
 * (checked BEFORE the slow analysis), confidence-gated (high auto-eligible,
 * medium reviewed grouped-by-slice with per-file override, uncertain / cycle /
 * violation files never moved), collision-guarded, and confirmed with a typed
 * token — not a bare Enter. `git checkout .` is the escape hatch.
 */
import React, { useEffect, useState } from 'react';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { COLORS } from '../constants.js';
import {
  checkPrecondition,
  refusalMessage,
  buildPlan,
  executeMigration,
  type MigrationPlan,
  type MovePlan,
  type ExecResult,
} from '../lib/migrator.js';

type Phase = 'input' | 'checking' | 'refused' | 'planning' | 'plan' | 'review' | 'confirm' | 'executing' | 'result';

export default function ExecuteMigration({ onBack }: { onBack: () => void }): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('input');
  const [path, setPath] = useState(process.cwd());
  const [refusal, setRefusal] = useState('');
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<MigrationPlan | null>(null);
  const [token, setToken] = useState('');
  const [result, setResult] = useState<ExecResult | null>(null);
  const [verify, setVerify] = useState('');

  // grouped review state
  const [groupIdx, setGroupIdx] = useState(0);
  const [perFile, setPerFile] = useState(false);
  const [fileIdx, setFileIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── precondition FIRST, then the (slower) analysis ──
  useEffect(() => {
    if (phase !== 'checking') return;
    const abs = resolve(path);
    if (!existsSync(abs)) {
      setError(`Folder not found: ${abs}`);
      setPhase('result');
      return;
    }
    const pre = checkPrecondition(abs);
    if (!pre.ok) {
      setRefusal(refusalMessage(pre.reason!));
      setPhase('refused');
      return;
    }
    setPhase('planning');
  }, [phase, path]);

  useEffect(() => {
    if (phase !== 'planning') return;
    let cancelled = false;
    void (async () => {
      await new Promise((r) => setTimeout(r, 15));
      try {
        const p = buildPlan(resolve(path));
        if (!cancelled) {
          setPlan(p);
          setPhase('plan');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setPhase('result');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, path]);

  useEffect(() => {
    if (phase !== 'executing') return;
    let cancelled = false;
    void (async () => {
      await new Promise((r) => setTimeout(r, 15));
      const abs = resolve(path);
      const medium = plan!.reviewBySlice.flatMap((g) => g.files).filter((f) => selected.has(f.rel));
      const moves = [...plan!.eligible, ...medium];
      try {
        const res = executeMigration(abs, moves);
        if (cancelled) return;
        setResult(res);
        // best-effort verification with the project's own toolchain
        let v = '';
        try {
          execSync('npx --no-install tsc --noEmit', { cwd: abs, stdio: 'pipe', timeout: 120000 });
          v = 'tsc --noEmit: PASS ✓';
        } catch {
          v = 'tsc --noEmit: reported errors (or no local tsc) — run it yourself to confirm';
        }
        try {
          const s = execSync('npx --no-install steiger ./src', { cwd: abs, encoding: 'utf8', timeout: 120000 })
            .replace(/\x1b\[[0-9;]*m/g, '');
          v += '\n  steiger: ' + (s.match(/Found \d+ error|No problems found/)?.[0] ?? 'ran');
        } catch (e) {
          const out = (e as { stdout?: Buffer }).stdout?.toString().replace(/\x1b\[[0-9;]*m/g, '') ?? '';
          v += '\n  steiger: ' + (out.match(/Found \d+ error/)?.[0] ?? 'needs the project’s own steiger');
        }
        if (!cancelled) {
          setVerify(v);
          setPhase('result');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setPhase('result');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, path, plan, selected]);

  useInput((_i, key) => key.escape && onBack(), { isActive: phase === 'input' });
  useInput((_i, key) => (key.escape || _i === 'b') && onBack(), { isActive: phase === 'refused' });

  // plan screen keys
  useInput(
    (input) => {
      if (input === 'b') return onBack();
      if (input === 'x') return setPhase('confirm'); // execute high-only, straight to confirm
      if (input === 'r') {
        if (plan!.reviewBySlice.length) setPhase('review');
        else setPhase('confirm');
      }
    },
    { isActive: phase === 'plan' }
  );

  // grouped review keys
  useInput(
    (input, key) => {
      const group = plan!.reviewBySlice[groupIdx];
      const advance = () => {
        setPerFile(false);
        setFileIdx(0);
        if (groupIdx + 1 >= plan!.reviewBySlice.length) setPhase('confirm');
        else setGroupIdx(groupIdx + 1);
      };
      if (!perFile) {
        if (input === 'a') {
          setSelected((s) => new Set([...s, ...group.files.map((f) => f.rel)]));
          advance();
        } else if (input === 's') advance();
        else if (input === 'f') setPerFile(true);
        else if (key.escape) onBack();
      } else {
        if (key.upArrow) setFileIdx((i) => Math.max(0, i - 1));
        else if (key.downArrow) setFileIdx((i) => Math.min(group.files.length - 1, i + 1));
        else if (input === ' ') {
          const rel = group.files[fileIdx].rel;
          setSelected((s) => {
            const n = new Set(s);
            n.has(rel) ? n.delete(rel) : n.add(rel);
            return n;
          });
        } else if (key.return) advance();
      }
    },
    { isActive: phase === 'review' }
  );

  useInput((_i, key) => key.escape && setPhase('plan'), { isActive: phase === 'confirm' });
  useInput(
    (input, key) => {
      if (input === 'r' || key.escape) {
        setPhase('input');
        setPlan(null);
        setSelected(new Set());
        setGroupIdx(0);
        setResult(null);
        setError('');
      } else if (input === 'b') onBack();
    },
    { isActive: phase === 'result' }
  );

  const title = (
    <Text color={COLORS.accent} bold>
      Execute FSD Migration
    </Text>
  );

  if (phase === 'input') {
    return (
      <Box flexDirection="column">
        {title}
        <Text color={COLORS.dim}>
          Moves real files into FSD structure via ts-morph. Requires a{' '}
          <Text color={COLORS.primary}>clean git tree</Text> — `git checkout .` undoes everything.
        </Text>
        <Box marginTop={1}>
          <Text color={COLORS.primary}>Folder: </Text>
          <TextInput value={path} onChange={setPath} onSubmit={() => setPhase('checking')} />
        </Box>
        <Text color={COLORS.dim}>Press Enter to check &amp; plan, or Esc to go back.</Text>
      </Box>
    );
  }

  if (phase === 'checking' || phase === 'planning') {
    return (
      <Box flexDirection="column">
        {title}
        <Text color={COLORS.primary}>
          <Text color={COLORS.accent}>
            <Spinner type="dots" />
          </Text>{' '}
          {phase === 'checking' ? 'Checking git precondition…' : 'Building migration plan…'}
        </Text>
      </Box>
    );
  }

  if (phase === 'refused') {
    return (
      <Box flexDirection="column">
        {title}
        {refusal.split('\n').map((l, i) => (
          <Text key={i} color={l.includes('✖') ? 'red' : COLORS.dim}>
            {l}
          </Text>
        ))}
        <Box marginTop={1}>
          <Text color={COLORS.dim}>Press b or Esc to go back.</Text>
        </Box>
      </Box>
    );
  }

  if (phase === 'plan') {
    const p = plan!;
    const reviewCount = p.reviewBySlice.reduce((n, g) => n + g.files.length, 0);
    return (
      <Box flexDirection="column">
        {title}
        <Text color={COLORS.primary} bold>
          {p.eligible.length} high-confidence file{p.eligible.length === 1 ? '' : 's'} eligible to move automatically:
        </Text>
        {p.eligible.slice(0, 12).map((m) => (
          <Text key={m.rel} color={COLORS.dim}>
            {'  '}
            {m.rel} <Text color={COLORS.accent}>→</Text> {m.dest}
            {m.siblings.length ? <Text color={COLORS.dim}> (+{m.siblings.length} co-located)</Text> : ''}
          </Text>
        ))}
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">
            {reviewCount} medium-confidence file{reviewCount === 1 ? '' : 's'} in {p.reviewBySlice.length} slice
            {p.reviewBySlice.length === 1 ? '' : 's'} — reviewed, never auto-moved.
          </Text>
          <Text color={COLORS.dim}>
            {'  '}
            {p.neverMove.length} never moved (uncertain / in a violation or cycle).
          </Text>
          {p.collisions.length ? (
            <Text color="red">
              {'  '}✖ {p.collisions.length} destination collision{p.collisions.length === 1 ? '' : 's'} — held back
              for manual naming (never auto-moved).
            </Text>
          ) : null}
        </Box>
        <Box marginTop={1}>
          <Text color={COLORS.dim}>
            Press <Text color={COLORS.primary}>r</Text> to review medium files,{' '}
            <Text color={COLORS.primary}>x</Text> to migrate high-confidence only, or{' '}
            <Text color={COLORS.primary}>b</Text> to go back.
          </Text>
        </Box>
      </Box>
    );
  }

  if (phase === 'review') {
    const g = plan!.reviewBySlice[groupIdx];
    return (
      <Box flexDirection="column">
        {title}
        <Text color={COLORS.accent}>
          Review slice {groupIdx + 1}/{plan!.reviewBySlice.length}: <Text color={COLORS.primary}>{g.slice}</Text>
        </Text>
        {g.files.map((f, i) => {
          const on = selected.has(f.rel);
          const cursor = perFile && i === fileIdx;
          return (
            <Text key={f.rel} color={cursor ? COLORS.accent : on ? COLORS.primary : COLORS.dim}>
              {'  '}
              {cursor ? '❯ ' : '  '}
              {on ? '[x]' : '[ ]'} {f.rel} → {f.dest}
            </Text>
          );
        })}
        <Box marginTop={1}>
          {perFile ? (
            <Text color={COLORS.dim}>
              ↑/↓ move · <Text color={COLORS.primary}>space</Text> toggle ·{' '}
              <Text color={COLORS.primary}>Enter</Text> next slice
            </Text>
          ) : (
            <Text color={COLORS.dim}>
              <Text color={COLORS.primary}>a</Text> accept whole slice ·{' '}
              <Text color={COLORS.primary}>s</Text> skip · <Text color={COLORS.primary}>f</Text> pick per file
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  if (phase === 'confirm') {
    const mediumSel = [...selected].length;
    const total = plan!.eligible.length + mediumSel;
    return (
      <Box flexDirection="column">
        {title}
        <Text color={COLORS.primary} bold>
          About to move {total} file{total === 1 ? '' : 's'} ({plan!.eligible.length} high + {mediumSel} reviewed) and
          rewrite their imports across the project.
        </Text>
        <Text color={COLORS.dim}>This changes real files. `git checkout .` restores everything.</Text>
        <Box marginTop={1}>
          <Text color={COLORS.accent}>Type </Text>
          <Text color={COLORS.primary} bold>
            migrate
          </Text>
          <Text color={COLORS.accent}> to proceed: </Text>
          <TextInput
            value={token}
            onChange={setToken}
            onSubmit={(v) => {
              if (v.trim() === 'migrate') {
                setToken('');
                setPhase('executing');
              } else setToken('');
            }}
          />
        </Box>
        <Text color={COLORS.dim}>(Enter alone does nothing — you must type the word. Esc to go back.)</Text>
      </Box>
    );
  }

  if (phase === 'executing') {
    return (
      <Box flexDirection="column">
        {title}
        <Text color={COLORS.primary}>
          <Text color={COLORS.accent}>
            <Spinner type="dots" />
          </Text>{' '}
          Moving files, fixing imports, writing barrels, verifying…
        </Text>
      </Box>
    );
  }

  // result
  return (
    <Box flexDirection="column">
      {title}
      {error ? (
        <Text color="red">✖ {error}</Text>
      ) : (
        <>
          <Text color={COLORS.primary} bold>
            ✔ Moved {result!.moved} file{result!.moved === 1 ? '' : 's'} ({result!.siblingsMoved} co-located siblings),
            rewired {result!.aliasFixed} imports to public APIs, wrote {result!.barrelsCreated} barrels.
          </Text>
          {verify
            ? verify.split('\n').map((l, i) => (
                <Text key={i} color={COLORS.dim}>
                  {'  '}
                  {l}
                </Text>
              ))
            : null}
          <Box marginTop={1}>
            <Text color={COLORS.accent}>
              Not happy with it? <Text color={COLORS.primary}>git checkout .</Text> restores everything instantly.
            </Text>
          </Box>
        </>
      )}
      <Box marginTop={1}>
        <Text color={COLORS.dim}>Press r to migrate another folder, or b to return to the menu.</Text>
      </Box>
    </Box>
  );
}
