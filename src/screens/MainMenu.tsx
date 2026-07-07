/**
 * The main menu: an arrow-key select list. The selected row is cyan (bold with
 * a ❯ pointer); unselected rows are dimmed green. Rows are also reachable by
 * pressing their number (1–6), handled natively by ink-select-input.
 */
import React from 'react';
import { Box, Text } from 'ink';
import SelectList, { type SelectListItem } from '../components/SelectList.js';
import { COLORS, VERSION, NAME, TAGLINE } from '../constants.js';
import type { MenuAction } from '../types.js';

const items: ReadonlyArray<SelectListItem<MenuAction>> = [
  { label: 'Create New Project', value: 'create' },
  { label: 'Check FSD Compliance', value: 'check' },
  { label: 'Analyze for FSD Migration', value: 'analyze' },
  { label: 'Execute FSD Migration', value: 'execute' },
  { label: 'About', value: 'about' },
  { label: 'Exit', value: 'exit' },
];

export default function MainMenu({
  onSelect,
}: {
  onSelect: (action: MenuAction) => void;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text color={COLORS.accent}>
        {NAME} v{VERSION} — {TAGLINE}
      </Text>
      <Text color={COLORS.dim}>Use ↑/↓ then Enter, or press 1–6.</Text>
      <Box marginTop={1}>
        <SelectList items={items} onSelect={onSelect} />
      </Box>
    </Box>
  );
}
