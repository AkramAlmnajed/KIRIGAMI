/**
 * "Check FSD Compliance": prompt for a folder (default: current directory),
 * run the bundled Steiger against it, and render a readable pass/fail report.
 */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { COLORS } from '../constants.js';
import { runSteiger, type SteigerReport } from '../lib/steiger.js';

type Phase = 'input' | 'running' | 'result';

// Build the ESC-based ANSI regex from a char code so no raw control byte ever
// lands in this source file (see phase-5 history for why that matters).
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;?]*[A-Za-z]', 'g');
const stripAnsi = (s: string): string => s.replace(ANSI, '');

export default function CheckCompliance({
  onBack,
}: {
  onBack: () => void;
}): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('input');
  const [path, setPath] = useState(process.cwd());
  const [report, setReport] = useState<SteigerReport | null>(null);

  useEffect(() => {
    if (phase !== 'running') return;
    let cancelled = false;
    void (async () => {
      const r = await runSteiger(path);
      if (!cancelled) {
        setReport(r);
        setPhase('result');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, path]);

  // On the result screen: b/Esc → menu, r → check another folder.
  useInput(
    (input, key) => {
      if (input === 'r') {
        setReport(null);
        setPhase('input');
      } else if (key.escape || input === 'b' || input === 'q') {
        onBack();
      }
    },
    { isActive: phase === 'result' }
  );

  // On the path-input screen: Esc → menu (Enter submits via TextInput).
  useInput((_input, key) => key.escape && onBack(), {
    isActive: phase === 'input',
  });

  if (phase === 'input') {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.accent} bold>
          Check FSD Compliance
        </Text>
        <Text color={COLORS.dim}>
          Enter a project or folder to analyze (its <Text color={COLORS.primary}>src/</Text> is
          used if present).
        </Text>
        <Box marginTop={1}>
          <Text color={COLORS.primary}>Folder: </Text>
          <TextInput
            value={path}
            onChange={setPath}
            onSubmit={() => setPhase('running')}
          />
        </Box>
        <Text color={COLORS.dim}>Press Enter to run Steiger, or Esc to go back.</Text>
      </Box>
    );
  }

  if (phase === 'running') {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.accent} bold>
          Check FSD Compliance
        </Text>
        <Text color={COLORS.primary}>
          <Text color={COLORS.accent}>
            <Spinner type="dots" />
          </Text>{' '}
          Running Steiger on {path}…
        </Text>
      </Box>
    );
  }

  // result
  const r = report!;
  const lines = stripAnsi(r.output).split('\n').filter((l) => l.trim().length > 0);
  const shown = lines.slice(0, 40);

  return (
    <Box flexDirection="column">
      <Text color={COLORS.accent} bold>
        Check FSD Compliance
      </Text>
      <Text color={COLORS.dim}>Analyzed: {r.analyzedPath}</Text>
      <Box marginTop={1} flexDirection="column">
        {r.error ? (
          <Text color="red">✖ {r.error}</Text>
        ) : r.ok ? (
          <Text color={COLORS.primary} bold>
            ✔ No FSD problems found.
          </Text>
        ) : (
          <>
            <Text color="red" bold>
              ✖ FSD problems found:
            </Text>
            <Box flexDirection="column" marginTop={1}>
              {shown.map((l, i) => (
                <Text key={i} color={COLORS.dim}>
                  {l}
                </Text>
              ))}
              {lines.length > shown.length ? (
                <Text color={COLORS.dim}>… {lines.length - shown.length} more lines</Text>
              ) : null}
            </Box>
          </>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color={COLORS.dim}>Press r to check another folder, or b to return to the menu.</Text>
      </Box>
    </Box>
  );
}
