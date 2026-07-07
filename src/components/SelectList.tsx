/**
 * A styled wrapper around ink-select-input used by every menu/choice list in
 * the app: selected row is cyan + bold with a ❯ pointer, unselected rows are
 * dim green. ink-select-input@6 handles arrow keys, Enter, and number-key
 * (1–9) selection natively, so no extra input handling is needed here.
 */
import React from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import { COLORS } from '../constants.js';

export interface SelectListItem<V extends string> {
  label: string;
  value: V;
}

function Indicator({ isSelected = false }: { isSelected?: boolean }): React.ReactElement {
  return <Text color={COLORS.accent}>{isSelected ? '❯ ' : '  '}</Text>;
}

function ItemView({
  isSelected = false,
  label,
}: {
  isSelected?: boolean;
  label: string;
}): React.ReactElement {
  return (
    <Text color={isSelected ? COLORS.accent : COLORS.dim} bold={isSelected}>
      {label}
    </Text>
  );
}

export default function SelectList<V extends string>({
  items,
  onSelect,
  isFocused = true,
  initialIndex = 0,
}: {
  items: ReadonlyArray<SelectListItem<V>>;
  onSelect: (value: V) => void;
  /** When false, the list ignores input (used to gate a confirm screen). */
  isFocused?: boolean;
  initialIndex?: number;
}): React.ReactElement {
  return (
    <SelectInput
      items={items as Array<SelectListItem<V>>}
      isFocused={isFocused}
      initialIndex={initialIndex}
      indicatorComponent={Indicator}
      itemComponent={ItemView}
      onSelect={(item) => onSelect((item as SelectListItem<V>).value)}
    />
  );
}
