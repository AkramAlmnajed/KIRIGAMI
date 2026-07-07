/**
 * Project-level config files: package.json (framework/styling/state-aware),
 * tsconfig(s) with FSD path aliases, steiger.config.ts (recommended ruleset),
 * .gitignore, and the generated project's README.md (which carries the
 * required Kirigami credit footer).
 */
import type { FileSpec, LayerConfig } from './types.js';
import type { WizardAnswers } from '../../types.js';

/** Path aliases for tsconfig `paths`. Pages alias differs per framework. */
function aliasPaths(cfg: LayerConfig): Record<string, string[]> {
  return {
    '@app/*': ['src/app/*'],
    [`${cfg.pagesAlias}/*`]: [`src/${cfg.pagesDir}/*`],
    '@widgets/*': ['src/widgets/*'],
    '@features/*': ['src/features/*'],
    '@entities/*': ['src/entities/*'],
    '@shared/*': ['src/shared/*'],
  };
}

function dependencies(a: WizardAnswers): {
  deps: Record<string, string>;
  devDeps: Record<string, string>;
} {
  const deps: Record<string, string> = {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
    // Always-on data / forms layer.
    axios: '^1.7.9',
    '@tanstack/react-query': '^5.62.7',
    'react-hook-form': '^7.54.0',
    zod: '^3.24.1',
    '@hookform/resolvers': '^3.9.1',
  };
  const devDeps: Record<string, string> = {
    typescript: '^5.6.3',
    '@types/react': '^18.3.12',
    '@types/react-dom': '^18.3.1',
    steiger: '^0.5.13',
    '@feature-sliced/steiger-plugin': '^0.6.0',
  };

  if (a.framework === 'nextjs') {
    deps.next = '^14.2.18';
    devDeps['@types/node'] = '^22.10.1';
    // NOTE: react-router-dom is intentionally NOT added on Next.js — the App
    // Router handles routing.
  } else {
    // React Router is Vite-only.
    deps['react-router-dom'] = '^6.28.0';
    devDeps.vite = '^5.4.11';
    devDeps['@vitejs/plugin-react'] = '^4.3.4';
    devDeps['@types/node'] = '^22.10.1';
  }

  if (a.styling === 'tailwind') {
    devDeps.tailwindcss = '^3.4.15';
    devDeps.postcss = '^8.4.49';
    devDeps.autoprefixer = '^10.4.20';
  } else if (a.styling === 'material-ui') {
    deps['@mui/material'] = '^6.1.10';
    deps['@emotion/react'] = '^11.13.5';
    deps['@emotion/styled'] = '^11.13.5';
  }

  if (a.stateMgmt === 'zustand') {
    deps.zustand = '^5.0.1';
  } else if (a.stateMgmt === 'redux') {
    deps['@reduxjs/toolkit'] = '^2.3.0';
    deps['react-redux'] = '^9.1.2';
  }

  if (a.iconLib === 'fontawesome') {
    deps['@fortawesome/fontawesome-svg-core'] = '^6.7.1';
    deps['@fortawesome/free-solid-svg-icons'] = '^6.7.1';
    deps['@fortawesome/react-fontawesome'] = '^0.2.2';
  }

  if (a.i18n === 'react-i18next') {
    deps.i18next = '^23.16.8';
    deps['react-i18next'] = '^15.1.3';
  }

  if (a.animations === 'framer-motion') {
    deps['framer-motion'] = '^11.15.0';
  }

  if (a.testing === 'vitest') {
    devDeps.vitest = '^2.1.8';
    devDeps.jsdom = '^25.0.1';
    devDeps['@testing-library/react'] = '^16.1.0';
    devDeps['@testing-library/dom'] = '^10.4.0';
    devDeps['@testing-library/jest-dom'] = '^6.6.3';
    // Needed for the React transform in tests (Vite already has it).
    devDeps['@vitejs/plugin-react'] = '^4.3.4';
  }

  return { deps, devDeps };
}

function scripts(a: WizardAnswers): Record<string, string> {
  const common: Record<string, string> = {
    // `lint` runs the FSD architecture check (this project's whole point);
    // `typecheck` covers type errors without pulling in an ESLint config.
    lint: 'steiger ./src',
    typecheck: 'tsc --noEmit',
  };
  if (a.testing === 'vitest') common.test = 'vitest run';
  if (a.framework === 'nextjs') {
    return { dev: 'next dev', build: 'next build', start: 'next start', ...common };
  }
  return { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview', ...common };
}

function sortObj(o: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}

export function packageJson(a: WizardAnswers): FileSpec {
  const { deps, devDeps } = dependencies(a);
  const pkg = {
    name: a.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: scripts(a),
    dependencies: sortObj(deps),
    devDependencies: sortObj(devDeps),
  };
  return { path: 'package.json', contents: JSON.stringify(pkg, null, 2) + '\n' };
}

export function tsconfigFiles(a: WizardAnswers, cfg: LayerConfig): FileSpec[] {
  const paths = aliasPaths(cfg);
  if (a.framework === 'nextjs') {
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['dom', 'dom.iterable', 'ES2022'],
        jsx: 'preserve',
        module: 'esnext',
        moduleResolution: 'bundler',
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        isolatedModules: true,
        skipLibCheck: true,
        allowJs: true,
        incremental: true,
        plugins: [{ name: 'next' }],
        baseUrl: '.',
        paths,
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      // `tests/` uses jest-dom matchers that Vitest augments at run time; keep
      // them out of the Next build's type-check (Vitest type-checks its own way).
      exclude: ['node_modules', 'tests'],
    };
    return [
      { path: 'tsconfig.json', contents: JSON.stringify(tsconfig, null, 2) + '\n' },
    ];
  }

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      useDefineForClassFields: true,
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      jsx: 'react-jsx',
      moduleResolution: 'bundler',
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      isolatedModules: true,
      skipLibCheck: true,
      baseUrl: '.',
      paths,
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  };
  const tsconfigNode = {
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
      strict: true,
    },
    include: ['vite.config.ts'],
  };
  return [
    { path: 'tsconfig.json', contents: JSON.stringify(tsconfig, null, 2) + '\n' },
    {
      path: 'tsconfig.node.json',
      contents: JSON.stringify(tsconfigNode, null, 2) + '\n',
    },
  ];
}

export function steigerConfig(a: WizardAnswers): FileSpec {
  if (a.framework !== 'nextjs') {
    // Vite keeps the canonical `pages` layer, so Steiger analyses it fully and
    // the recommended ruleset (incl. insignificant-slice) works as intended.
    return {
      path: 'steiger.config.ts',
      contents: `import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([...fsd.configs.recommended]);
`,
    };
  }

  // Next.js: disable ONLY insignificant-slice — see the loud comment below.
  return {
    path: 'steiger.config.ts',
    contents: `import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

// ───────────────────────────────────────────────────────────────────────────
// KNOWN LIMITATION (Next.js) — the \`fsd/insignificant-slice\` rule is OFF.
//
// This project's FSD "pages" layer is named \`views\` (renamed to avoid the
// Next.js \`src/pages\` Router collision). Steiger only recognises the canonical
// layer name \`pages\`, so it CANNOT see the \`views\` folder — and therefore
// cannot count references that flow from your pages into features/widgets/
// entities. With this rule ON, any feature you reference only from a \`views\`
// page is falsely flagged as "This slice has no references."
//
// So a feature that is genuinely used gets a false error. We disable ONLY this
// one rule; every other FSD rule stays active. If you add a feature and want to
// double-check it really is wired up, reference it from a \`views\` page (normal)
// and/or from the app layer.
//
// (The Vite template keeps the canonical \`pages\` name and leaves this rule ON.)
// ───────────────────────────────────────────────────────────────────────────

export default defineConfig([
  ...fsd.configs.recommended,
  { rules: { 'fsd/insignificant-slice': 'off' } },
]);
`,
  };
}

export function gitignore(a: WizardAnswers): FileSpec {
  const framework =
    a.framework === 'nextjs'
      ? `# next\n/.next/\n/out/\nnext-env.d.ts\n`
      : `# vite\ndist/\n`;
  return {
    path: '.gitignore',
    contents: `# dependencies\nnode_modules/\n\n# build\n${framework}\n# misc\n.DS_Store\n*.log\n.env*.local\n`,
  };
}

/**
 * The project's actual chosen stack as human labels, framework first. Shared
 * by the generated README's description and the homepage's "what's included"
 * list so the two can never disagree.
 */
export function stackList(a: WizardAnswers): string[] {
  const list: string[] = [
    a.framework === 'nextjs' ? 'Next.js (App Router)' : 'React Vite',
    a.styling === 'tailwind'
      ? 'Tailwind CSS'
      : a.styling === 'material-ui'
        ? 'Material UI'
        : 'CSS Modules',
  ];
  if (a.stateMgmt !== 'none') {
    list.push(a.stateMgmt === 'zustand' ? 'Zustand' : 'Redux Toolkit');
  }
  if (a.iconLib === 'fontawesome') list.push('Font Awesome');
  if (a.i18n === 'react-i18next') list.push('react-i18next');
  if (a.animations === 'framer-motion') list.push('Framer Motion');
  if (a.testing === 'vitest') list.push('Vitest + Testing Library');
  return list;
}

export function readme(a: WizardAnswers, cfg: LayerConfig): FileSpec {
  const pm = a.pkgManager;
  const run = pm === 'npm' ? 'npm run' : pm; // pnpm dev / yarn dev / npm run dev
  const install = pm === 'npm' ? 'npm install' : `${pm} install`;
  const pagesNote =
    cfg.pagesDir === 'views'
      ? ' (FSD pages layer, renamed to avoid Next\'s src/pages Router; the Vite template uses `pages`)'
      : ' (FSD pages layer; the Next.js template names this `views` to avoid Next\'s src/pages Router)';
  const layers = [
    `src/app        — FSD app layer (providers, routing)`,
    `src/${cfg.pagesDir.padEnd(9)}${pagesNote}`,
    `src/widgets    — composite UI blocks (empty, ready to fill)`,
    `src/features   — user interactions (includes a working login slice)`,
    `src/entities   — business entities (empty, ready to fill)`,
    `src/shared     — ui, api (axios + React Query), lib (hooks/helpers), + store/config as configured`,
  ].join('\n');
  const routingLine =
    a.framework === 'nextjs'
      ? 'Routing is handled by the Next.js App Router (`app/`).'
      : 'Routing uses `react-router-dom` (see `src/app/routes.tsx`).';

  // Full chosen stack for the one-line description (framework named in the
  // sentence itself, so drop the first entry).
  const stack = stackList(a).slice(1);

  // Concrete pointers for the optional extras that are enabled.
  const extras = [
    a.i18n === 'react-i18next'
      ? '**react-i18next** (init in `src/shared/config`, a translated tagline on the home page)'
      : null,
    a.animations === 'framer-motion'
      ? '**Framer Motion** (a `FadeIn` wrapper in `src/shared/ui`)'
      : null,
    a.testing === 'vitest'
      ? `**Vitest + Testing Library** (\`${run} test\`, example tests in \`tests/\`)`
      : null,
  ].filter(Boolean);
  const extrasLine =
    extras.length > 0 ? `\n\nAlso set up: ${extras.join('; ')}.` : '';

  const testScriptLine =
    a.testing === 'vitest'
      ? `\n- \`${run} test\`  — run the test suite (Vitest)`
      : '';

  const steigerNote =
    a.framework === 'nextjs'
      ? `
## ⚠️ Steiger + Next.js — a known blind spot (read this)

The FSD "pages" layer is named \`views\` in this template, to avoid colliding
with the Next.js \`src/pages\` Router. **Steiger only recognises the canonical
layer name \`pages\`, so it cannot see the \`views\` folder** — and therefore
cannot count references that flow from your pages into \`features\`,
\`widgets\`, or \`entities\`.

Consequence: with Steiger's \`fsd/insignificant-slice\` rule on, **every feature
you reference only from a \`views\` page is falsely flagged** as
_"This slice has no references."_ This is not your mistake — it is a limitation
of Steiger not understanding the renamed layer.

**What we did:** \`steiger.config.ts\` turns off **only** \`fsd/insignificant-slice\`.
Every other FSD rule stays active, so \`${run} lint\` still checks layer
boundaries, public APIs, segment names, etc.

**What you should do:** add features and reference them from your \`views\` pages
as normal. If you want extra assurance a feature is actually wired up (since
Steiger won't tell you), also import it from the \`app\` layer, or move the
relevant page temporarily to a \`pages/\` folder to check.
`
      : '';

  return {
    path: 'README.md',
    contents: `# ${a.projectName}

A ${a.framework === 'nextjs' ? 'Next.js (App Router)' : 'React Vite'} project with a
[Feature-Sliced Design](https://feature-sliced.design) architecture and ${stack.join(', ')}.

Batteries included: **axios**, **TanStack Query**, and **react-hook-form + zod**
are wired up, with a working \`features/login\` slice (a zod-validated login
form) as a concrete example. ${routingLine}${extrasLine}

## Getting started

\`\`\`bash
${install}
${run} dev
\`\`\`

## Your homepage

The homepage you see on first run is Kirigami's starter welcome screen, kept in
one self-contained, deletable file: \`src/${cfg.pagesDir}/home/ui/Welcome.tsx\`.
To start your real project:

1. Delete \`src/${cfg.pagesDir}/home/ui/Welcome.tsx\`.
2. In \`src/${cfg.pagesDir}/home/ui/home-page.tsx\`, replace \`<Welcome />\` with
   your own homepage.

Nothing else depends on that file, so removing it leaves the FSD structure and
the login demo intact.

## Scripts

- \`${run} dev\`   — start the dev server
- \`${run} build\` — production build
- \`${run} lint\`  — check FSD architecture compliance (Steiger)
- \`${run} typecheck\` — TypeScript type check${testScriptLine}

## Architecture

\`\`\`
${layers}
\`\`\`

Each slice exposes a public API via its \`index.ts\` barrel; import slices only
through those barrels (path aliases \`@app\`, \`${cfg.pagesAlias}\`, \`@widgets\`,
\`@features\`, \`@entities\`, \`@shared\`). Higher layers may import lower ones,
never the reverse. Run \`${run} lint\` to verify.
${steigerNote}
---

_Scaffolded with Kirigami — created by Akram Almnajed (github.com/AkramAlmnajed)._
`,
  };
}
