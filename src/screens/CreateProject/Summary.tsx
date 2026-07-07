/**
 * Wizard confirm screen: shows the captured answers for review, then a
 * deliberate confirm control.
 *
 * Guard against accidental generation: a user finishing step 5 selects the
 * package manager with a digit, and ink-select-input selects on the digit
 * alone — but a habitual Enter pressed a beat later could bleed into this
 * screen. Two defenses:
 *   1. an input-lock (~300ms) on mount, during which the list ignores input,
 *      so a carried-over keypress is swallowed;
 *   2. the destructive "Generate" action is NOT the default-highlighted row —
 *      the cursor starts on "Go back", so a stray Enter is harmless.
 */
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectList, { type SelectListItem } from '../../components/SelectList.js';
import { COLORS } from '../../constants.js';
import { LABELS, type WizardAnswers } from '../../types.js';
import { resolveBaseDir, tildify } from '../../lib/fsutil.js';

type ConfirmAction = 'back' | 'generate';

const CONFIRM_ITEMS: ReadonlyArray<SelectListItem<ConfirmAction>> = [
  { label: 'Go back to the menu (don’t generate)', value: 'back' },
  { label: 'Generate project', value: 'generate' },
];

export default function Summary({
  answers,
  onConfirm,
  onBack,
}: {
  answers: WizardAnswers;
  onConfirm: () => void;
  onBack: () => void;
}): React.ReactElement {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const rows: Array<[string, string]> = [
    ['Project name', answers.projectName],
    ['Location', tildify(resolveBaseDir(answers))],
    ['Framework', LABELS.framework[answers.framework]],
    ['Styling', LABELS.styling[answers.styling]],
    ['State management', LABELS.stateMgmt[answers.stateMgmt]],
    ['Package manager', LABELS.pkgManager[answers.pkgManager]],
    ['Icon library', LABELS.iconLib[answers.iconLib]],
    ['Testing', LABELS.testing[answers.testing]],
    ['i18n', LABELS.i18n[answers.i18n]],
    ['Animations', LABELS.animations[answers.animations]],
  ];

  return (
    <Box flexDirection="column">
      <Text color={COLORS.accent} bold>
        Review your choices
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {rows.map(([key, val]) => (
          <Text key={key}>
            <Text color={COLORS.dim}>{key.padEnd(18)}</Text>
            <Text color={COLORS.primary}>{val}</Text>
          </Text>
        ))}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={COLORS.dim}>
          {ready ? 'Confirm to scaffold the project:' : 'Review the choices above…'}
        </Text>
        <SelectList
          items={CONFIRM_ITEMS}
          isFocused={ready}
          onSelect={(v) => (v === 'generate' ? onConfirm() : onBack())}
        />
      </Box>
    </Box>
  );
}
