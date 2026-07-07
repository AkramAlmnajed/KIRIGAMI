/**
 * The always-on data layer that lives in `shared`:
 *   - shared/api: a configured axios instance (baseURL from an env placeholder)
 *     and a shared TanStack QueryClient, each with a public-API barrel.
 *   - shared/lib: the FSD-conventional home for reusable hooks/helpers, with a
 *     starter `useToggle` hook and a barrel. (Named `lib`, not `hooks`:
 *     Steiger's recommended ruleset forbids segment names that describe *what*
 *     the code is — `hooks`, `utils`, `helpers`, … — and requires a public
 *     API, so an empty README-only `shared/hooks` would fail two rules.)
 *
 * The axios baseURL reads a framework-appropriate env var (Vite uses
 * import.meta.env.VITE_*, Next uses process.env.NEXT_PUBLIC_*).
 */
import type { FileSpec } from './types.js';
import type { Framework } from '../../types.js';

export function apiFiles(framework: Framework): FileSpec[] {
  const baseUrl =
    framework === 'nextjs'
      ? `process.env.NEXT_PUBLIC_API_URL ?? '/api'`
      : `import.meta.env.VITE_API_URL ?? '/api'`;

  return [
    {
      path: 'src/shared/api/axios.ts',
      contents: `import axios from 'axios';

/**
 * Shared axios instance. Set the base URL via ${
   framework === 'nextjs' ? 'NEXT_PUBLIC_API_URL' : 'VITE_API_URL'
 } in your environment.
 */
export const api = axios.create({
  baseURL: ${baseUrl},
  headers: { 'Content-Type': 'application/json' },
});
`,
    },
    {
      path: 'src/shared/api/query-client.ts',
      contents: `import { QueryClient } from '@tanstack/react-query';

/** Shared TanStack Query client, provided at the app layer. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});
`,
    },
    {
      path: 'src/shared/api/index.ts',
      contents: `export { api } from './axios';\nexport { queryClient } from './query-client';\n`,
    },
    {
      path: 'src/shared/lib/use-toggle.ts',
      contents: `import { useCallback, useState } from 'react';

/** Boolean toggle — a starter reusable hook. Add more helpers alongside it. */
export function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle];
}
`,
    },
    {
      path: 'src/shared/lib/index.ts',
      contents: `export { useToggle } from './use-toggle';\n`,
    },
    {
      path: 'src/shared/lib/README.md',
      contents: `# shared/lib

Reusable, business-agnostic hooks and helpers (e.g. \`useToggle\`,
\`useDebounce\`, formatters). Add a file and re-export it from \`index.ts\`.

> Named \`lib\` (not \`hooks\`): FSD/Steiger reserve conventional segment names
> (\`ui\`, \`api\`, \`lib\`, \`model\`, \`config\`) and flag "what-it-is" names like
> \`hooks\`. \`lib\` is the conventional home for reusable hooks.
`,
    },
  ];
}
