/**
 * The success screen shown after a project is generated: a green checkmark,
 * the created path, the exact next-steps commands for the chosen package
 * manager, and the creator credit line once more (per the branding rules).
 */
import React from 'react';
import { basename } from 'node:path';
import { Box, Text } from 'ink';
import Credit from '../../components/Credit.js';
import { COLORS } from '../../constants.js';
import type { WizardAnswers } from '../../types.js';

function commands(pm: WizardAnswers['pkgManager']): { install: string; dev: string } {
  if (pm === 'npm') return { install: 'npm install', dev: 'npm run dev' };
  if (pm === 'pnpm') return { install: 'pnpm install', dev: 'pnpm dev' };
  return { install: 'yarn', dev: 'yarn dev' };
}

export default function Success({
  answers,
  result,
}: {
  answers: WizardAnswers;
  result: { count: number; dir: string };
}): React.ReactElement {
  const { install, dev } = commands(answers.pkgManager);
  const name = basename(result.dir);
  const steps = [`cd ${name}`, install, dev];

  return (
    <Box flexDirection="column">
      <Text color={COLORS.primary} bold>
        ✔ Project created successfully!
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text color={COLORS.dim}>Location: </Text>
          <Text color={COLORS.accent}>{result.dir}</Text>
        </Text>
        <Text color={COLORS.dim}>
          {result.count} files · Feature-Sliced Design architecture ·{' '}
          {answers.framework === 'nextjs' ? 'Next.js' : 'Vite'}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={COLORS.accent}>Next steps:</Text>
        {steps.map((s) => (
          <Text key={s} color={COLORS.primary}>
            {'  '}
            {s}
          </Text>
        ))}
        <Text color={COLORS.dim}>
          {'  '}
          {answers.pkgManager === 'npm' ? 'npm run' : answers.pkgManager} lint {' '}
          <Text color={COLORS.dim}>— check FSD compliance anytime</Text>
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Credit />
        <Text color={COLORS.dim}>Press b to return to the menu.</Text>
      </Box>
    </Box>
  );
}
