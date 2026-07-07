#!/usr/bin/env node
/**
 * Kirigami CLI entry point.
 *
 * Parses --help / --version (which work outside the interactive menu) with
 * meow, then renders the Ink app. The shebang + `chmod +x` (see build script)
 * make this file directly executable as the globally-linked `kirigami` command.
 */
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './app.js';
import { NAME, TAGLINE, VERSION } from './constants.js';

const cli = meow(
  `
  ${NAME} — ${TAGLINE}

  Usage
    $ kirigami

  Options
    --help       Show this help
    --version    Show the version

  Run with no arguments to open the interactive menu.
`,
  {
    importMeta: import.meta,
    version: VERSION,
    flags: {},
  }
);

// meow handles --help / --version and exits on its own. Anything else -> app.
void cli;

render(<App />);
