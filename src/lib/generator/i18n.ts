/**
 * react-i18next support:
 *   - shared/config/i18n.ts: a synchronous i18next init with inline resources
 *     (sync init matters — it lets translations resolve during SSR/prerender).
 *   - shared/config/index.ts: public-API barrel.
 *   - shared/ui/tagline.tsx: a component that renders a translated string via
 *     useTranslation. On Next it's a Client Component (useTranslation is a
 *     client hook).
 *
 * The <I18nextProvider> is wired into the app-layer Providers (see providers.ts).
 */
import type { FileSpec } from './types.js';
import type { Framework } from '../../types.js';

export function i18nFiles(framework: Framework): FileSpec[] {
  const uc = framework === 'nextjs' ? `'use client';\n\n` : '';
  return [
    {
      path: 'src/shared/config/i18n.ts',
      contents: `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Synchronous init with inline resources so translations resolve during SSR.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { tagline: 'Cut your UI into clean, sliced layers.' } },
    es: { translation: { tagline: 'Divide tu interfaz en capas limpias.' } },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export { i18n };
`,
    },
    {
      path: 'src/shared/config/index.ts',
      contents: `export { i18n } from './i18n';\n`,
    },
    {
      path: 'src/shared/ui/tagline.tsx',
      contents: `${uc}import { useTranslation } from 'react-i18next';

/** Renders a translated tagline via react-i18next. */
export function Tagline() {
  const { t } = useTranslation();
  return <p className="kg-tagline">{t('tagline')}</p>;
}
`,
    },
  ];
}
