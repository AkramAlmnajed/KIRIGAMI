/**
 * "Analyze for FSD Migration": prompt for a folder (default: current
 * directory), build a real import graph with ts-morph, classify each file into
 * a suggested FSD layer, surface architectural problems, and write a
 * FSD-MIGRATION-REPORT.md to the analyzed project's ROOT.
 *
 * READ-ONLY guarantee: the analyzer never touches existing files; the ONLY
 * write is the new report at the project root (never inside src/).
 */
import React, { useEffect, useState } from 'react';
import { join, resolve } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { COLORS } from '../constants.js';
import { analyzeProject, type AnalyzeResult } from '../lib/analyzer.js';

type Phase = 'input' | 'running' | 'result';

interface Outcome {
  result?: AnalyzeResult;
  reportPath?: string;
  error?: string;
}

const LAYER_ORDER = ['app', 'pages', 'widgets', 'features', 'entities', 'shared', 'uncertain'];

export default function AnalyzeMigration({
  onBack,
}: {
  onBack: () => void;
}): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('input');
  const [path, setPath] = useState(process.cwd());
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (phase !== 'running') return;
    let cancelled = false;
    void (async () => {
      // Let the "Analyzing…" frame paint before the synchronous ts-morph parse.
      await new Promise((r) => setTimeout(r, 15));
      try {
        const abs = resolve(path);
        if (!existsSync(abs)) {
          if (!cancelled) setOutcome({ error: `Folder not found: ${abs}` });
        } else {
          const result = analyzeProject(abs);
          if (result.fileCount === 0) {
            if (!cancelled) setOutcome({ error: `No analyzable .ts/.tsx source files under ${abs}` });
          } else {
            // The ONLY write: the report at the project root.
            const reportPath = join(abs, result.reportFileName);
            writeFileSync(reportPath, result.report);
            if (!cancelled) setOutcome({ result, reportPath });
          }
        }
      } catch (err) {
        if (!cancelled) setOutcome({ error: err instanceof Error ? err.message : String(err) });
      }
      if (!cancelled) setPhase('result');
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, path]);

  useInput(
    (input, key) => {
      if (input === 'r') {
        setOutcome(null);
        setPhase('input');
      } else if (key.escape || input === 'b' || input === 'q') {
        onBack();
      }
    },
    { isActive: phase === 'result' }
  );
  useInput((_input, key) => key.escape && onBack(), { isActive: phase === 'input' });

  if (phase === 'input') {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.accent} bold>
          Analyze for FSD Migration
        </Text>
        <Text color={COLORS.dim}>
          Point at any TypeScript React project. It builds a real import graph and
          suggests an FSD layer for each file.
        </Text>
        <Text color={COLORS.dim}>
          Read-only: nothing is moved or changed — a{' '}
          <Text color={COLORS.primary}>FSD-MIGRATION-REPORT.md</Text> is written to the
          project root.
        </Text>
        <Box marginTop={1}>
          <Text color={COLORS.primary}>Folder: </Text>
          <TextInput value={path} onChange={setPath} onSubmit={() => setPhase('running')} />
        </Box>
        <Text color={COLORS.dim}>Press Enter to analyze, or Esc to go back.</Text>
      </Box>
    );
  }

  if (phase === 'running') {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.accent} bold>
          Analyze for FSD Migration
        </Text>
        <Text color={COLORS.primary}>
          <Text color={COLORS.accent}>
            <Spinner type="dots" />
          </Text>{' '}
          Building import graph and classifying {path}…
        </Text>
      </Box>
    );
  }

  // result
  const o = outcome!;
  return (
    <Box flexDirection="column">
      <Text color={COLORS.accent} bold>
        Analyze for FSD Migration
      </Text>
      {o.error ? (
        <Text color="red">✖ {o.error}</Text>
      ) : (
        <>
          <Text color={COLORS.primary} bold>
            ✔ Analyzed {o.result!.fileCount} files (read-only — nothing moved or changed).
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text color={COLORS.accent}>Suggested layer distribution:</Text>
            {LAYER_ORDER.filter((l) => o.result!.layerCounts[l]).map((l) => (
              <Text key={l}>
                <Text color={l === 'uncertain' ? 'yellow' : COLORS.dim}>
                  {'  '}
                  {(l + (l === 'uncertain' ? ' ⚠' : '')).padEnd(12)}
                </Text>
                <Text color={COLORS.primary}>{o.result!.layerCounts[l]}</Text>
              </Text>
            ))}
            <Text color={COLORS.dim}>
              {'  '}confidence: {o.result!.confidence.high} high · {o.result!.confidence.medium}{' '}
              medium · {o.result!.confidence.low} low
            </Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            {o.result!.violations.length || o.result!.cycles.length ? (
              <Text color="yellow">
                ⚠ {o.result!.violations.length} upward-import{o.result!.violations.length === 1 ? '' : 's'}
                {' '}and {o.result!.cycles.length} circular dependenc
                {o.result!.cycles.length === 1 ? 'y' : 'ies'} — need real refactoring, not just
                moving (details in the report).
              </Text>
            ) : (
              <Text color={COLORS.dim}>No layer-direction violations or cycles found.</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text>
              <Text color={COLORS.dim}>Report written to: </Text>
              <Text color={COLORS.accent}>{o.reportPath}</Text>
            </Text>
          </Box>
        </>
      )}
      <Box marginTop={1}>
        <Text color={COLORS.dim}>Press r to analyze another folder, or b to return to the menu.</Text>
      </Box>
    </Box>
  );
}
