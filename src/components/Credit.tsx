/**
 * The creator credit line. Always rendered — there is no prop or flag to hide
 * it. Kept as its own component so every screen composes the exact same text.
 *
 * The name is gold (#C9A227 — Akram's portfolio gold): this line is a
 * signature, not standard UI, and it pairs with the katana's gold fittings so
 * the accent reads as deliberate brand language. The URL stays dim green.
 *
 * `centered` centers each line within the banner's rendered width — used only
 * by the chrome block under the logo (Layout). In-body placements (About,
 * Success) stay left-aligned.
 */
import React from 'react';
import { Box, Text } from 'ink';
import { CREDIT, COLORS } from '../constants.js';
import { centerInBanner } from './Banner.js';

export default function Credit({
  centered = false,
}: {
  centered?: boolean;
}): React.ReactElement {
  const fmt = (s: string): string => (centered ? centerInBanner(s) : s);
  return (
    <Box flexDirection="column">
      <Text color={COLORS.gold}>{fmt(CREDIT.name)}</Text>
      <Text color={COLORS.dim}>{fmt(CREDIT.url)}</Text>
    </Box>
  );
}
