/**
 * Framework base files + app-layer wiring.
 *
 * Next.js: a thin root `app/` (routing only) with `/` → HomePage and
 * `/login` → LoginPage, plus the FSD app layer at `src/app/`. No router library
 * — Next's App Router handles routing. The root layout wraps the tree in the
 * always-present <Providers>.
 *
 * Vite: index.html + `src/main.tsx` bootstrap wrapping <App/> in <Providers>.
 * `src/app/routes.tsx` holds the route table (shared, so it can be exercised in
 * a test), and `src/app/App.tsx` renders it under a BrowserRouter via
 * react-router-dom.
 */
import type { FileSpec, LayerConfig } from './types.js';
import type { WizardAnswers } from '../../types.js';
import { globalsCss } from './styling.js';

const APP_LAYER_README = `# app

Composition root: providers, routing, and app-wide setup. May import from every
layer below. Nothing imports the app layer, so it has no public-API barrel
requirement.
`;

export function nextFiles(answers: WizardAnswers, cfg: LayerConfig): FileSpec[] {
  const files: FileSpec[] = [];

  files.push({
    path: 'next.config.mjs',
    contents: `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
`,
  });
  files.push({
    path: 'next-env.d.ts',
    contents: `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited. Next.js regenerates it.
`,
  });
  files.push({ path: 'app/globals.css', contents: globalsCss(answers.styling) });
  files.push({
    path: 'app/layout.tsx',
    contents: `import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from '@app/providers';

export const metadata = {
  title: '${answers.projectName}',
  description: 'Scaffolded with Kirigami — Feature-Sliced Design.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`,
  });
  files.push({
    path: 'app/page.tsx',
    contents: `import { HomePage } from '@views/home';

export default function Page() {
  return <HomePage />;
}
`,
  });
  files.push({
    path: 'app/login/page.tsx',
    contents: `import { LoginPage } from '@views/login';
import { Header } from '@widgets/header';

export default function Page() {
  return (
    <>
      <Header />
      <LoginPage />
    </>
  );
}
`,
  });
  files.push({ path: 'src/app/README.md', contents: APP_LAYER_README });
  return files;
}

export function viteFiles(answers: WizardAnswers, _cfg: LayerConfig): FileSpec[] {
  const files: FileSpec[] = [];

  files.push({
    path: 'index.html',
    contents: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${answers.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  });
  files.push({
    path: 'vite.config.ts',
    contents: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': r('./src/app'),
      '@pages': r('./src/pages'),
      '@widgets': r('./src/widgets'),
      '@features': r('./src/features'),
      '@entities': r('./src/entities'),
      '@shared': r('./src/shared'),
    },
  },
});
`,
  });
  files.push({
    path: 'src/vite-env.d.ts',
    contents: `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`,
  });
  files.push({ path: 'src/app/globals.css', contents: globalsCss(answers.styling) });
  files.push({
    path: 'src/app/routes.tsx',
    contents: `import type { RouteObject } from 'react-router-dom';
import { HomePage } from '@pages/home';
import { LoginPage } from '@pages/login';
import { Header } from '@widgets/header';

/** Route table — shared so it can be exercised directly in tests. The app
 * renders the header (widgets/header) on the login route only — this is where
 * widgets/header is referenced (from the app layer), and it keeps the header
 * off the homepage. */
export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  {
    path: '/login',
    element: (
      <>
        <Header />
        <LoginPage />
      </>
    ),
  },
];
`,
  });
  files.push({
    path: 'src/app/App.tsx',
    contents: `import { BrowserRouter, useRoutes } from 'react-router-dom';
import { routes } from './routes';

function AppRoutes() {
  return useRoutes(routes);
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
`,
  });
  files.push({
    path: 'src/app/index.ts',
    contents: `export { App } from './App';\nexport { routes } from './routes';\n`,
  });
  files.push({
    path: 'src/main.tsx',
    contents: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from '@app/providers';
import { App } from './app';
import './app/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
);
`,
  });
  files.push({ path: 'src/app/README.md', contents: APP_LAYER_README });
  return files;
}
