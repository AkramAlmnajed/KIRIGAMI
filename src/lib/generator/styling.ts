/**
 * Styling setup. Tailwind ships a tailwind.config + postcss.config and a
 * globals.css of @tailwind directives. CSS Modules needs no build config (both
 * Next and Vite support *.module.css out of the box); its globals.css is a
 * minimal reset. The globals.css file itself is placed by the framework module
 * (Next: app/globals.css; Vite: src/app/globals.css).
 */
import type { FileSpec } from './types.js';
import type { Styling, Framework } from '../../types.js';

export function globalsCss(styling: Styling): string {
  if (styling === 'tailwind') {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  }
  if (styling === 'material-ui') {
    // MUI's <CssBaseline /> handles the reset; keep globals minimal.
    return `:root {
  color-scheme: light dark;
}
`;
  }
  return `:root {
  color-scheme: light dark;
}
* {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}
`;
}

/** Build-tool config files (Tailwind only). */
export function stylingConfigFiles(
  styling: Styling,
  framework: Framework
): FileSpec[] {
  if (styling !== 'tailwind') return [];

  const globs =
    framework === 'nextjs'
      ? ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}']
      : ['./index.html', './src/**/*.{ts,tsx}'];
  const content = globs.map((g) => `'${g}'`).join(', ');

  return [
    {
      path: 'tailwind.config.ts',
      contents: `import type { Config } from 'tailwindcss';

export default {
  content: [${content}],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
`,
    },
    {
      path: 'postcss.config.mjs',
      contents: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
    },
  ];
}
