/**
 * Root Ink component and screen router. Holds the current screen in state and
 * renders the matching screen inside the shared <Layout> (so the banner +
 * katana + credit appear on every screen). Selecting "Exit" unmounts the app.
 *
 * Non-TTY stdin (piped output, no raw mode): the interactive menu can't run —
 * Ink's useInput needs raw mode — so render the static banner block plus a
 * short notice and exit cleanly instead of crashing or hanging.
 */
import React, { useEffect, useState } from 'react';
import { Text, useApp } from 'ink';
import Layout from './components/Layout.js';
import MainMenu from './screens/MainMenu.js';
import CreateProject from './screens/CreateProject/index.js';
import CheckCompliance from './screens/CheckCompliance.js';
import AnalyzeMigration from './screens/AnalyzeMigration.js';
import ExecuteMigration from './screens/ExecuteMigration.js';
import About from './screens/About.js';
import { COLORS } from './constants.js';
import type { Screen, MenuAction } from './types.js';

const INTERACTIVE = Boolean(process.stdin.isTTY);

export default function App(): React.ReactElement {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>('menu');

  // Non-TTY: print the static frame, then exit cleanly.
  useEffect(() => {
    if (INTERACTIVE) return;
    const t = setTimeout(() => exit(), 50);
    return () => clearTimeout(t);
  }, [exit]);

  const handleMenu = (action: MenuAction): void => {
    if (action === 'exit') {
      exit();
      return;
    }
    setScreen(action);
  };

  const back = (): void => setScreen('menu');

  if (!INTERACTIVE) {
    return (
      <Layout>
        <Text color={COLORS.dim}>
          Interactive menu needs a terminal (TTY). Run kirigami directly in a
          terminal, or use --help / --version.
        </Text>
      </Layout>
    );
  }

  return (
    <Layout>
      {screen === 'menu' && <MainMenu onSelect={handleMenu} />}
      {screen === 'create' && <CreateProject onExit={back} />}
      {screen === 'check' && <CheckCompliance onBack={back} />}
      {screen === 'analyze' && <AnalyzeMigration onBack={back} />}
      {screen === 'execute' && <ExecuteMigration onBack={back} />}
      {screen === 'about' && <About onBack={back} />}
    </Layout>
  );
}
