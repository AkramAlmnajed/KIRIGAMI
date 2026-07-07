/**
 * Shared screen chrome: banner + katana divider + subtitle (all inside
 * <Banner>), then the credit line, then the screen's own content. Every screen
 * renders through this wrapper so the banner, katana mark, and (non-removable)
 * credit appear on every single run.
 *
 * During the one-time slice-reveal intro, the credit and screen content are
 * held back until the katana settles; on every later render (and in non-TTY
 * mode) `shouldAnimateIntro()` is false and everything shows immediately.
 */
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import Banner from './Banner.js';
import Credit from './Credit.js';
import { COLORS } from '../constants.js';
import { shouldAnimateIntro } from './intro.js';

export default function Layout({
  children,
}: {
  children?: React.ReactNode;
}): React.ReactElement {
  const [ready, setReady] = useState(() => !shouldAnimateIntro());

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner onDone={() => setReady(true)} />
      {ready && (
        <Box flexDirection="column">
          <Credit centered />
          <Text color={COLORS.dim}>
            ────────────────────────────────────────────────────────
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {children}
          </Box>
        </Box>
      )}
    </Box>
  );
}
