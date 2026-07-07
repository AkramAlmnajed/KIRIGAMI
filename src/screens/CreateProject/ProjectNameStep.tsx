/**
 * Wizard step 1: project name (free text). Validates that the name is
 * non-empty and uses only characters that are safe for a folder / npm package
 * name before advancing.
 */
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { COLORS } from '../../constants.js';

export default function ProjectNameStep({
  initial = '',
  onSubmit,
}: {
  initial?: string;
  onSubmit: (name: string) => void;
}): React.ReactElement {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');

  const handleSubmit = (raw: string): void => {
    const name = raw.trim();
    // Enforce npm package-name rules (a superset of valid folder names):
    // lowercase only, URL-safe chars, may not start with '.' or '_', <= 214 chars.
    if (!name) {
      setError('Project name cannot be empty.');
      return;
    }
    if (name.length > 214) {
      setError('Name must be 214 characters or fewer.');
      return;
    }
    if (/[A-Z]/.test(name)) {
      setError('Use lowercase letters only (npm names cannot be uppercase).');
      return;
    }
    if (/^[._]/.test(name)) {
      setError('Name cannot start with a dot or underscore.');
      return;
    }
    // First char must be a lowercase letter or digit; the rest may add . _ -
    // (rejects spaces and any non-URL-safe character such as @, /, ~, etc.).
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
      setError('Use only lowercase letters, numbers, and . _ - (no spaces).');
      return;
    }
    onSubmit(name);
  };

  return (
    <Box flexDirection="column">
      <Text color={COLORS.accent} bold>
        Step 1 of 10 — Project name
      </Text>
      <Box marginTop={1}>
        <Text color={COLORS.primary}>Name: </Text>
        <TextInput
          value={value}
          placeholder="my-app"
          onChange={(v) => {
            setValue(v);
            if (error) setError('');
          }}
          onSubmit={handleSubmit}
        />
      </Box>
      {error ? (
        <Text color="red">✖ {error}</Text>
      ) : (
        <Text color={COLORS.dim}>Type a name and press Enter to continue.</Text>
      )}
    </Box>
  );
}
