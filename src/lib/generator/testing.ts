/**
 * Vitest + Testing Library setup. Self-contained vitest.config.ts (jsdom +
 * the FSD path aliases + the React plugin) so it works on both Vite and Next.
 * Tests live in a top-level `tests/` dir (outside `src/`) so Steiger never
 * scans them and the framework build's tsconfig can exclude them.
 *
 * The example test is deliberately robust across every wizard combination: a
 * pure zod-schema unit test, and a Button render test (Button renders its
 * children identically under Tailwind / MUI / CSS Modules).
 */
import type { FileSpec, LayerConfig } from './types.js';

export function testingFiles(cfg: LayerConfig): FileSpec[] {
  return [
    {
      path: 'vitest.config.ts',
      contents: `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@app': r('./src/app'),
      '${cfg.pagesAlias}': r('./src/${cfg.pagesDir}'),
      '@widgets': r('./src/widgets'),
      '@features': r('./src/features'),
      '@entities': r('./src/entities'),
      '@shared': r('./src/shared'),
    },
  },
});
`,
    },
    {
      path: 'tests/setup.ts',
      contents: `import '@testing-library/jest-dom';\n`,
    },
    {
      path: 'tests/example.test.tsx',
      contents: `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@shared/ui';
import { loginSchema } from '@features/login';

describe('loginSchema (zod)', () => {
  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'longenough' });
    expect(result.success).toBe(false);
  });

  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });
});

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
`,
    },
  ];
}
