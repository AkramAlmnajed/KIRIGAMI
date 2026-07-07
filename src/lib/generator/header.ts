/**
 * widgets/header — a slim nav bar (project name + the login feature's
 * SignInLink). It is a genuine widget composing a feature's public API, and the
 * app renders it on the login route (see framework.ts). That makes it the
 * second reference to features/login (the first is the login page rendering
 * LoginForm) — which keeps features/login clear of Steiger's insignificant-slice
 * rule on Vite, with NO login content on the homepage.
 *
 * The header itself is referenced only by the app layer, which Steiger exempts
 * from insignificant-slice (app-level layout composition).
 */
import type { FileSpec } from './types.js';
import type { WizardAnswers } from '../../types.js';

export function headerFiles(a: WizardAnswers): FileSpec[] {
  const { styling, framework, projectName } = a;
  const uc = framework === 'nextjs' && styling === 'material-ui' ? `'use client';\n\n` : '';
  let body: string;

  if (styling === 'material-ui') {
    body = `${uc}import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import { SignInLink } from '@features/login';

export function Header() {
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar sx={{ justifyContent: 'space-between', py: 1.5 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: '#EDEAE3' }}>${projectName}</Typography>
        <Box>
          <SignInLink />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
`;
  } else if (styling === 'tailwind') {
    body = `import { SignInLink } from '@features/login';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-[#EDEAE3]/15 px-6 py-4">
      <span className="text-base font-semibold text-[#EDEAE3]">${projectName}</span>
      <SignInLink />
    </header>
  );
}
`;
  } else {
    body = `import { SignInLink } from '@features/login';

export function Header() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(237, 234, 227, 0.15)',
        padding: '1rem 1.5rem',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: '1rem', color: '#EDEAE3' }}>${projectName}</span>
      <SignInLink />
    </header>
  );
}
`;
  }

  return [
    { path: 'src/widgets/header/ui/header.tsx', contents: body },
    { path: 'src/widgets/header/index.ts', contents: `export { Header } from './ui/header';\n` },
  ];
}
