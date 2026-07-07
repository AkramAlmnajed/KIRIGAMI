/**
 * Framer Motion support: a small `shared/ui/FadeIn` wrapper that animates its
 * children in on mount. On Next it's a Client Component ('use client') because
 * Framer Motion uses client-only hooks — this is the same class of boundary bug
 * that bit us in Phase 7, so it is handled explicitly here.
 */
import type { FileSpec } from './types.js';
import type { Framework } from '../../types.js';

export function animationsFiles(framework: Framework): FileSpec[] {
  const uc = framework === 'nextjs' ? `'use client';\n\n` : '';
  return [
    {
      path: 'src/shared/ui/fade-in.tsx',
      contents: `${uc}import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Fade + rise on mount — a small Framer Motion wrapper for content. */
export function FadeIn({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
`,
    },
  ];
}
