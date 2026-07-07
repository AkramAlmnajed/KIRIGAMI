/**
 * The app-layer `Providers` component. TanStack Query's provider is always
 * present (React Query is an always-on dependency); Material UI's
 * ThemeProvider + CssBaseline and Redux's store Provider are added when chosen.
 * Providers nest outer→inner: QueryClient › MUI Theme › Redux › children.
 *
 * On Next.js this is a Client Component ('use client') because every provider
 * here relies on client-side React context.
 */
import type { FileSpec } from './types.js';
import type { WizardAnswers } from '../../types.js';

interface Wrap {
  open: string[];
  close: string[];
}

export function providersFile(answers: WizardAnswers): FileSpec {
  const isNext = answers.framework === 'nextjs';
  const useMui = answers.styling === 'material-ui';
  const useRedux = answers.stateMgmt === 'redux';
  const useI18n = answers.i18n === 'react-i18next';

  const imports: string[] = [
    `import type { ReactNode } from 'react';`,
    `import { QueryClientProvider } from '@tanstack/react-query';`,
    `import { queryClient } from '@shared/api';`,
  ];
  if (useMui) {
    imports.push(
      `import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';`
    );
  }
  if (useI18n) {
    imports.push(
      `import { I18nextProvider } from 'react-i18next';`,
      `import { i18n } from '@shared/config';`
    );
  }
  if (useRedux) {
    imports.push(
      `import { Provider } from 'react-redux';`,
      `import { store } from '@shared/store';`
    );
  }

  // Nesting layers, outermost first.
  const layers: Wrap[] = [
    { open: ['<QueryClientProvider client={queryClient}>'], close: ['</QueryClientProvider>'] },
  ];
  if (useI18n) {
    layers.push({
      open: ['<I18nextProvider i18n={i18n}>'],
      close: ['</I18nextProvider>'],
    });
  }
  if (useMui) {
    layers.push({
      open: ['<ThemeProvider theme={theme}>', '<CssBaseline />'],
      close: ['</ThemeProvider>'],
    });
  }
  if (useRedux) {
    layers.push({ open: ['<Provider store={store}>'], close: ['</Provider>'] });
  }

  // Build the JSX tree with indentation.
  const lines: string[] = [];
  let depth = 3; // inside `return (` → base indent
  const pad = (n: number): string => '  '.repeat(n);
  for (const layer of layers) {
    for (const o of layer.open) {
      lines.push(pad(depth) + o);
      if (o.startsWith('<CssBaseline')) continue; // self-closing, no depth change
      depth += 1;
    }
  }
  lines.push(pad(depth) + '{children}');
  for (const layer of [...layers].reverse()) {
    for (const c of [...layer.close]) {
      depth -= 1;
      lines.push(pad(depth) + c);
    }
  }

  const themeConst = useMui ? `\nconst theme = createTheme();\n` : '';
  const directive = isNext ? `'use client';\n\n` : '';

  return {
    path: 'src/app/providers.tsx',
    contents: `${directive}${imports.join('\n')}
${themeConst}
export function Providers({ children }: { children: ReactNode }) {
  return (
${lines.join('\n')}
  );
}
`,
  };
}
