/**
 * The About screen: tool name, one-line description, version, GitHub link, and
 * the creator credit line. Press Enter/Esc/b to return to the menu.
 */
import React from 'react';
import { Box, Text, useInput } from 'ink';
import Credit from '../components/Credit.js';
import { COLORS, NAME, VERSION, GITHUB_URL, REPO_URL } from '../constants.js';

export default function About({ onBack }: { onBack: () => void }): React.ReactElement {
  useInput((input, key) => {
    if (key.return || key.escape || input === 'b' || input === 'q') onBack();
  });

  const rows: Array<[string, string]> = [
    ['Name', NAME],
    ['Version', VERSION],
    [
      'About',
      'A terminal tool that scaffolds React/Next.js projects with correct Feature-Sliced Design architecture.',
    ],
    ['Repository', REPO_URL],
    ['GitHub', GITHUB_URL],
  ];

  return (
    <Box flexDirection="column">
      <Text color={COLORS.accent} bold>
        About {NAME}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {rows.map(([key, val]) => (
          <Text key={key}>
            <Text color={COLORS.dim}>{key.padEnd(12)}</Text>
            <Text color={COLORS.primary}>{val}</Text>
          </Text>
        ))}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Credit />
        <Text color={COLORS.dim}>Press b to return to the menu.</Text>
      </Box>
    </Box>
  );
}
