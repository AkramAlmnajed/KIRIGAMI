/**
 * Detail view of wizard step 2 (Project location) when "Custom path…" is
 * chosen: free-text path input with ~ expansion, relative-or-absolute
 * resolution, and an immediate writability pre-check on the nearest existing
 * ancestor (a non-existent path is fine — it is created at generation time).
 * Esc returns to the 3-way location choice.
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { COLORS } from '../../constants.js';
import { expandUserPath, writabilityError, tildify } from '../../lib/fsutil.js';
import { isAbsolute, resolve } from 'node:path';

export default function CustomPathStep({
  onSubmit,
  onBack,
}: {
  onSubmit: (rawPath: string) => void;
  onBack: () => void;
}): React.ReactElement {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useInput((_input, key) => key.escape && onBack());

  const resolved = (() => {
    const expanded = expandUserPath(value);
    if (!expanded) return '';
    return isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
  })();

  const handleSubmit = (raw: string): void => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError('Path cannot be empty.');
      return;
    }
    const expanded = expandUserPath(trimmed);
    const abs = isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
    const writeErr = writabilityError(abs);
    if (writeErr) {
      setError(writeErr);
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Box flexDirection="column">
      <Text color={COLORS.accent} bold>
        Step 2 of 10 — Project location (custom path)
      </Text>
      <Text color={COLORS.dim}>
        ~ expands to your home directory; relative paths resolve against the
        current directory. Missing folders are created automatically.
      </Text>
      <Box marginTop={1}>
        <Text color={COLORS.primary}>Path: </Text>
        <TextInput
          value={value}
          placeholder="~/projects"
          onChange={(v) => {
            setValue(v);
            if (error) setError('');
          }}
          onSubmit={handleSubmit}
        />
      </Box>
      {error ? (
        <Text color="red">✖ {error}</Text>
      ) : resolved ? (
        <Text color={COLORS.dim}>Will create the project in: {tildify(resolved)}</Text>
      ) : (
        <Text color={COLORS.dim}>Type a path and press Enter (Esc to go back).</Text>
      )}
    </Box>
  );
}
