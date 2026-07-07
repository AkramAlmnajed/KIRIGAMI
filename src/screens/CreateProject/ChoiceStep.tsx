/**
 * A generic wizard select step: a "Step N of 5 — Title" header, an optional
 * prompt, and a styled SelectList of options. Reused for the framework,
 * styling, state-management, and package-manager steps.
 */
import React from 'react';
import { Box, Text } from 'ink';
import SelectList, { type SelectListItem } from '../../components/SelectList.js';
import { COLORS } from '../../constants.js';

export default function ChoiceStep<V extends string>({
  step,
  title,
  items,
  onSelect,
}: {
  step: number;
  title: string;
  items: ReadonlyArray<SelectListItem<V>>;
  onSelect: (value: V) => void;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text color={COLORS.accent} bold>
        Step {step} of 10 — {title}
      </Text>
      <Text color={COLORS.dim}>Use ↑/↓ then Enter, or press the number.</Text>
      <Box marginTop={1}>
        <SelectList items={items} onSelect={onSelect} />
      </Box>
    </Box>
  );
}
