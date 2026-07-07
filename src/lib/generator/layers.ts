/**
 * FSD layer scaffolding shared by both frameworks:
 *  - a short README.md in every layer explaining its role + public-API rule
 *  - a starter `shared/ui/button` component (Tailwind / MUI / CSS Modules)
 *  - the shared/ui barrel (exports Button, plus FadeIn/Tagline when chosen)
 *  - a home page + login page (both in views/pages) referencing features/login
 *  - empty, ready-to-fill `widgets` and `entities` layers
 *
 * HomePage uses composition slots for the optional Tagline (i18n) and FadeIn
 * (Framer Motion) so the three styling variants don't multiply by every
 * optional feature. (shared/api + shared/lib come from api.ts, the login slice
 * from login.ts, FadeIn from animations.ts, Tagline/i18n config from i18n.ts.)
 */
import type { FileSpec, LayerConfig } from './types.js';
import { stackList } from './configs.js';
import type { WizardAnswers, Styling, Framework } from '../../types.js';

/** Next.js Client Component directive for components that need client context. */
function uc(framework: Framework): string {
  return framework === 'nextjs' ? "'use client';\n\n" : '';
}

const LAYER_DOCS: Record<string, string> = {
  widgets:
    'Large, self-sufficient UI blocks composed from features and entities (e.g. a Header, a Sidebar).',
  entities:
    'Business entities and their data (e.g. User, Product): model, api, and UI representations.',
  shared:
    'Reusable, business-agnostic code: UI kit, api client, hooks, config. Imports nothing above it.',
};

function layerReadme(name: string, blurb: string): string {
  return `# ${name}

${blurb}

## Public API

Every slice exposes a public API through its \`index.ts\` barrel. Import a slice
only through that barrel (e.g. \`@shared/ui\`), never by reaching into its
internal files. Higher layers may import lower ones, never the reverse.
`;
}

function buttonFiles(styling: Styling, framework: Framework): FileSpec[] {
  const files: FileSpec[] = [];
  if (styling === 'tailwind') {
    files.push({
      path: 'src/shared/ui/button.tsx',
      contents: `import type { ReactNode } from 'react';

export interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700"
    >
      {children}
    </button>
  );
}
`,
    });
  } else if (styling === 'material-ui') {
    files.push({
      path: 'src/shared/ui/button.tsx',
      contents: `${uc(framework)}import type { ReactNode } from 'react';
import MuiButton from '@mui/material/Button';

export interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <MuiButton variant="contained" onClick={onClick}>
      {children}
    </MuiButton>
  );
}
`,
    });
  } else {
    files.push({
      path: 'src/shared/ui/button.module.css',
      contents: `.button {
  border: none;
  border-radius: 6px;
  background: #0f172a;
  color: #fff;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
}
.button:hover {
  background: #334155;
}
`,
    });
    files.push({
      path: 'src/shared/ui/button.tsx',
      contents: `import type { ReactNode } from 'react';
import styles from './button.module.css';

export interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button type="button" onClick={onClick} className={styles.button}>
      {children}
    </button>
  );
}
`,
    });
  }
  return files;
}

/** shared/ui public-API barrel — includes optional FadeIn / Tagline. */
function sharedUiBarrel(framer: boolean, i18n: boolean): FileSpec {
  const lines = [
    `export { Button } from './button';`,
    `export type { ButtonProps } from './button';`,
  ];
  if (framer) lines.push(`export { FadeIn } from './fade-in';`);
  if (i18n) lines.push(`export { Tagline } from './tagline';`);
  return { path: 'src/shared/ui/index.ts', contents: lines.join('\n') + '\n' };
}

// --- Welcome / Login shared theme system ----------------------------------
// The generated home + login screens share one atmosphere: a lighter charcoal
// void, a Canvas-2D water/dot-grid (ripples physically displace a dot grid drawn
// on the canvas itself — one system, not two stacked layers), paper cards, and
// the katana footer. These helpers return framework-agnostic pure strings that
// get inlined into BOTH generated files at generation time — so Kirigami's own
// source stays DRY while each generated file still imports nothing from any
// other generated file at runtime (the system is baked in, not shared through an
// import). Zero runtime dependencies: plain Canvas 2D only.

/** Per-framework font wiring (IBM Plex Mono + Newsreader) shared by both pages. */
function welcomeFonts(framework: Framework): {
  importLine: string;
  mono: string;
  serif: string;
  cssImport: string;
  rootClass: string;
} {
  if (framework === 'nextjs') {
    return {
      importLine:
        `import { IBM_Plex_Mono, Newsreader } from 'next/font/google';\n` +
        `const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-plex-mono' });\n` +
        `const newsreader = Newsreader({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-newsreader' });\n`,
      mono: 'var(--font-plex-mono), ui-monospace, monospace',
      serif: 'var(--font-newsreader), Georgia, serif',
      cssImport: '',
      rootClass: '{`kg-w-root ${plexMono.variable} ${newsreader.variable}`}',
    };
  }
  return {
    importLine: '',
    mono: "'IBM Plex Mono', ui-monospace, monospace",
    serif: "'Newsreader', Georgia, serif",
    cssImport:
      "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Newsreader:wght@400;500&display=swap');\n",
    rootClass: '"kg-w-root"',
  };
}

/**
 * The full stylesheet shared by the home and login screens. The dot grid is NOT
 * a CSS background here — it is drawn on the canvas so the water ripples can
 * displace it — so the root only paints the lighter void colour. Both pages
 * embed this identical block (a few home-only or login-only rules ride along
 * harmlessly), guaranteeing the two screens match exactly.
 */
function sharedThemeCss(mono: string, serif: string, cssImport: string): string {
  return `${cssImport}body { margin: 0; background: #2B2720; }
.kg-w-root { --void:#2B2720; --paper:#EDE6D6; --ink:#211E19; --ink-soft:#4A453C; --chalk:#EDEAE3; --chalk-muted:#928F89; --gold:#C9A227; --gold-bright:#E8C24A; --ember:#00FF41; position: relative; min-height: 100vh; box-sizing: border-box; padding: 5rem 1.5rem; background-color: var(--void); overflow-x: hidden; font-family: ${serif}; color: var(--chalk-muted); }
.kg-w-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.kg-w-shell { position: relative; z-index: 1; max-width: 54rem; margin: 0 auto; display: flex; flex-direction: column; gap: 2.75rem; }
.kg-w-eyebrow { margin: 0; font-family: ${mono}; font-size: 0.82rem; letter-spacing: 0.01em; color: var(--chalk-muted); display: inline-flex; align-items: center; }
.kg-w-caret { display: inline-block; width: 0.5rem; height: 1.05em; margin-left: 0.4rem; background: var(--gold-bright); animation: kg-blink 1.05s steps(1) infinite; }
.kg-w-h1 { margin: 0.95rem 0 0; font-family: ${mono}; font-weight: 600; font-size: clamp(2.1rem, 5.5vw, 3.2rem); letter-spacing: -0.02em; line-height: 1.08; color: var(--chalk); }
.kg-w-gold { color: var(--gold-bright); }
.kg-tagline { margin: 0.85rem 0 0; color: var(--chalk-muted); font-size: 1rem; }
.kg-w-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 640px) { .kg-w-grid { grid-template-columns: 1fr 1fr; } }
.kg-w-card { position: relative; display: block; box-sizing: border-box; text-decoration: none; padding: 1.5rem 1.5rem 1.6rem; background: var(--paper); color: var(--ink); clip-path: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%); transform: rotate(var(--rot, 0deg)); transform-origin: center; box-shadow: 0 12px 26px rgba(0, 0, 0, 0.5); transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease; }
.kg-w-card:hover { transform: rotate(0deg) translateY(-6px); box-shadow: 0 20px 44px rgba(0, 0, 0, 0.6); filter: drop-shadow(0 8px 16px rgba(201, 162, 39, 0.4)); }
.kg-w-card-cat { display: block; margin-bottom: 0.7rem; font-family: ${mono}; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--ink-soft); opacity: 0.72; }
.kg-w-card-title { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 0.55rem; font-family: ${mono}; font-weight: 600; font-size: 1.05rem; color: var(--ink); }
.kg-w-arrow { color: var(--gold); transition: transform 0.15s ease; }
.kg-w-card:hover .kg-w-arrow { transform: translateX(3px); }
.kg-w-card-desc { margin: 0; font-size: 0.98rem; line-height: 1.5; color: var(--ink-soft); }
.kg-w-back { align-self: flex-start; font-family: ${mono}; font-size: 0.85rem; color: var(--chalk-muted); text-decoration: none; transition: color 0.15s ease; }
.kg-w-back:hover { color: var(--gold); }
.kg-w-panel { position: relative; box-sizing: border-box; width: 100%; max-width: 26rem; margin: 0 auto; padding: 2rem 1.75rem; background: var(--paper); color: var(--ink); clip-path: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%); box-shadow: 0 12px 26px rgba(0, 0, 0, 0.5); }
.kg-w-footer { position: relative; padding-top: 1.75rem; }
.kg-w-divider { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(201, 162, 39, 0.6), transparent); }
.kg-w-badge { display: inline-flex; align-items: center; gap: 0.7rem; text-decoration: none; color: var(--gold); font-family: ${mono}; font-size: 0.85rem; }
.kg-w-katana { flex: none; display: block; }
@keyframes kg-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce), (hover: none), (pointer: coarse) {
  .kg-w-card { transform: none; }
  .kg-w-card:hover { transform: none; box-shadow: 0 12px 26px rgba(0, 0, 0, 0.5); filter: none; }
  .kg-w-card:hover .kg-w-arrow { transform: none; }
  .kg-w-caret { animation: none; }
}`;
}

/**
 * Body of the water useEffect. A dot grid (28px) is drawn on the canvas; each
 * mousemove (throttled ~110ms) spawns a ripple whose radius grows via
 * easeOutCubic (~6px → ~110px over ~95 frames). Dots inside a ~16px band around
 * the expanding wave-front are pushed radially outward (up to ~3px, scaled by
 * front-closeness × ripple-earliness) and tinted toward blue-white; all other
 * dots sit at rest as plain dim white. The rAF loop only runs while ripples are
 * alive (quiet when idle), and the cleanup cancels it and removes both listeners
 * on unmount. Reduced-motion attaches no mousemove listener, so no ripples ever
 * spawn — the grid renders once, at rest. String concatenation only (no template
 * literals) so it inlines cleanly.
 */
function waterCanvasEffect(): string {
  return `    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const SPACING = 28;
    const RIPPLE_LIFE = 95;
    const RIPPLE_MIN_R = 6;
    const RIPPLE_MAX_R = 110;
    const BAND = 16;
    const MAX_DISPLACE = 3;

    type Dot = { x: number; y: number };
    type Ripple = { x: number; y: number; life: number };
    const dots: Dot[] = [];
    const ripples: Ripple[] = [];
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    let vw = 0;
    let vh = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const buildDots = () => {
      dots.length = 0;
      for (let y = SPACING / 2; y < vh + SPACING; y += SPACING) {
        for (let x = SPACING / 2; x < vw + SPACING; x += SPACING) {
          dots.push({ x, y });
        }
      }
    };

    let raf = 0;
    let running = false;

    const renderFrame = () => {
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].life++;
        if (ripples[i].life >= RIPPLE_LIFE) ripples.splice(i, 1);
      }
      ctx.clearRect(0, 0, vw, vh);
      for (let d = 0; d < dots.length; d++) {
        const dot = dots[d];
        let dx = 0;
        let dy = 0;
        let tint = 0;
        for (let r = 0; r < ripples.length; r++) {
          const rip = ripples[r];
          const t = rip.life / RIPPLE_LIFE;
          const radius = RIPPLE_MIN_R + (RIPPLE_MAX_R - RIPPLE_MIN_R) * easeOutCubic(t);
          const ox = dot.x - rip.x;
          const oy = dot.y - rip.y;
          const dist = Math.sqrt(ox * ox + oy * oy) || 0.0001;
          const delta = Math.abs(dist - radius);
          if (delta < BAND) {
            const intensity = (1 - delta / BAND) * (1 - t);
            if (intensity > 0) {
              const push = intensity * MAX_DISPLACE;
              dx += (ox / dist) * push;
              dy += (oy / dist) * push;
              if (intensity > tint) tint = intensity;
            }
          }
        }
        const x = dot.x + dx;
        const y = dot.y + dy;
        const cr = Math.round(255 - 55 * tint);
        const cg = Math.round(255 - 25 * tint);
        const alpha = (0.1 + 0.55 * tint).toFixed(3);
        ctx.fillStyle = 'rgba(' + cr + ', ' + cg + ', 255, ' + alpha + ')';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    };

    const step = () => {
      renderFrame();
      if (ripples.length > 0) {
        raf = window.requestAnimationFrame(step);
      } else {
        running = false;
        raf = 0;
      }
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = window.requestAnimationFrame(step);
      }
    };

    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
      if (!running) renderFrame();
    };
    resize();
    window.addEventListener('resize', resize);

    let lastSpawn = 0;
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpawn < 110) return;
      lastSpawn = now;
      ripples.push({ x: e.clientX, y: e.clientY, life: 0 });
      start();
    };
    if (!reduce) window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.cancelAnimationFrame(raf);
    };`;
}

/** The shared footer JSX (gold divider + exact pre-tested katana SVG + credit),
 * inlined verbatim into both the home and login screens. Both files declare the
 * REPO const this references. */
function footerBlock(): string {
  return `        <footer className="kg-w-footer">
          <span className="kg-w-divider" aria-hidden="true" />
          <a className="kg-w-badge" href={REPO} target="_blank" rel="noreferrer">
            <svg className="kg-w-katana" width="56" height="28" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M 38 50 C 68 40, 128 24, 188 8 L 189 11 C 130 27, 70 43, 40 58 Z" fill="#E4E3E0" />
              <path d="M 189 11 C 130 27, 70 43, 40 58" fill="none" stroke="#E8C24A" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="35" cy="53" r="8.5" fill="#E8C24A" stroke="#7A5F1E" strokeWidth="1" />
              <path d="M 8 62 L 29 44 L 37 53 L 14 70 Z" fill="#6B5119" />
              <path d="M 37 53 L 23.75 48.5 L 31.25 57.25 L 18.5 53 L 25.5 61.5 L 13.25 57.5 L 19.75 65.75 L 8 62" fill="none" stroke="#C9A227" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx="9" cy="65" r="4.5" fill="#E8C24A" />
            </svg>
            Powered by Kirigami
          </a>
        </footer>`;
}

function homePageFiles(a: WizardAnswers, pages: string): FileSpec[] {
  const dir = `src/${pages}/home`;
  const { framework } = a;
  const framer = a.animations === 'framer-motion';
  const i18n = a.i18n === 'react-i18next';
  const fwWord = framework === 'nextjs' ? 'Next.js' : 'React';
  const fwDocsUrl = framework === 'nextjs' ? 'https://nextjs.org/docs' : 'https://react.dev';
  const files: FileSpec[] = [];

  // Welcome.tsx — self-contained, styling-agnostic starter screen. Its whole
  // look (lighter void, Canvas-2D water/dot-grid, paper cards, katana footer)
  // lives in one embedded <style>, an in-file Card component, and a single water
  // useEffect (no sub-files, zero deps beyond React — plain Canvas 2D, no
  // library). It references no slices (no login content), so the widgets/header +
  // features/login mechanism and reference counts are unaffected. Deleting this
  // file removes all of it. It shares its background + footer + card styling with
  // the login page via the generator-side helpers above (inlined, not imported).
  //
  // Motion gating: the water effect reads prefers-reduced-motion in its effect
  // and, when reduced, attaches no mousemove listener, so no ripples ever spawn —
  // the dot grid renders once, at rest. The cards' static rotation + hover lift
  // are pure CSS, flattened to their resting state on touch / no-hover /
  // reduced-motion via one media query. The effect's cleanup cancels the pending
  // animation frame and removes both listeners on unmount.
  const fonts = welcomeFonts(framework);
  const clientDirective = framework === 'nextjs' ? `'use client';\n\n` : '';
  const uiImports = [...(framer ? ['FadeIn'] : []), ...(i18n ? ['Tagline'] : [])];
  const uiImportLine = uiImports.length
    ? `import { ${uiImports.join(', ')} } from '@shared/ui';\n`
    : '';
  const fwFlag = framework === 'nextjs' ? 'nextjs' : 'vite';
  // Static tagline (exact project copy) in the default scaffold; when i18n is on,
  // the translated <Tagline /> component takes its place.
  const tagline = i18n
    ? '\n          <Tagline />'
    : '\n          <p className="kg-tagline">Cut your UI into clean, sliced layers.</p>';
  const gridOpen = framer ? '<FadeIn>' : '';
  const gridClose = framer ? '</FadeIn>' : '';

  const welcome = `${clientDirective}/**
 * Kirigami's starter welcome screen.
 * Delete this file and replace <Welcome /> in home-page.tsx
 * with your own homepage to start your real project.
 */
${fonts.importLine}import { useRef, useEffect, type CSSProperties } from 'react';
${uiImportLine}
const REPO = 'https://github.com/AkramAlmnajed/kirigami';

const CARDS = [
  {
    title: 'FSD Docs',
    category: 'methodology',
    rot: '-1.2deg',
    href: 'https://feature-sliced.design',
    external: true,
    desc: 'The Feature-Sliced Design methodology behind your app / pages / widgets / features / entities / shared layers.',
  },
  {
    title: '${fwWord} Docs',
    category: 'framework',
    rot: '0.9deg',
    href: '${fwDocsUrl}',
    external: true,
    desc: 'Framework guides, API reference, and tutorials.',
  },
  {
    title: "What's Included",
    category: 'the stack',
    rot: '0.7deg',
    href: 'https://github.com/AkramAlmnajed/kirigami#readme',
    external: true,
    desc: 'See what "batteries included" means — the stack every Kirigami scaffold ships with.',
  },
  {
    title: 'Login Demo',
    category: 'try it live',
    rot: '-0.8deg',
    href: '/login',
    external: false,
    desc: 'A real zod + react-hook-form login on its own page — submit invalid input to see the validation wiring.',
  },
];

const welcomeStyles = \`${sharedThemeCss(fonts.mono, fonts.serif, fonts.cssImport)}\`;

function Card({ card }: { card: (typeof CARDS)[number] }) {
  const linkProps = card.external ? { target: '_blank', rel: 'noreferrer' } : {};
  return (
    <a
      className="kg-w-card"
      href={card.href}
      {...linkProps}
      style={{ ['--rot']: card.rot } as CSSProperties}
    >
      <span className="kg-w-card-cat">{card.category}</span>
      <h2 className="kg-w-card-title">
        {card.title} <span className="kg-w-arrow" aria-hidden="true">→</span>
      </h2>
      <p className="kg-w-card-desc">{card.desc}</p>
    </a>
  );
}

export function Welcome() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
${waterCanvasEffect()}
  }, []);

  return (
    <div className=${fonts.rootClass}>
      <style dangerouslySetInnerHTML={{ __html: welcomeStyles }} />
      <canvas ref={canvasRef} className="kg-w-canvas" aria-hidden="true" />
      <div className="kg-w-shell">
        <header className="kg-w-header">
          <p className="kg-w-eyebrow">
            kirigami create --${fwFlag} — scaffold complete
            <span className="kg-w-caret" aria-hidden="true" />
          </p>
          <h1 className="kg-w-h1">
            Welcome to <span className="kg-w-gold">${fwWord}</span>
          </h1>${tagline}
        </header>

        ${gridOpen}<section className="kg-w-grid">
          {CARDS.map((c) => (
            <Card key={c.href} card={c} />
          ))}
        </section>${gridClose}

${footerBlock()}
      </div>
    </div>
  );
}
`;

  files.push({ path: `${dir}/ui/Welcome.tsx`, contents: welcome });
  files.push({
    path: `${dir}/ui/home-page.tsx`,
    contents: `import { Welcome } from './Welcome';

export function HomePage() {
  return <Welcome />;
}
`,
  });
  files.push({
    path: `${dir}/index.ts`,
    contents: `export { HomePage } from './ui/home-page';\n`,
  });
  return files;
}

function loginPageFiles(pages: string, framework: Framework): FileSpec[] {
  const dir = `src/${pages}/login`;
  const fonts = welcomeFonts(framework);
  const isNext = framework === 'nextjs';
  const clientDirective = isNext ? `'use client';\n\n` : '';
  const routerImport = isNext ? '' : `import { Link } from 'react-router-dom';\n`;
  // Plain "back home" navigation link — Next uses <a href="/">, Vite uses
  // react-router's <Link to="/">. It imports nothing from features/login and does
  // not touch the widgets/header mechanism, so Steiger reference counts are
  // unaffected.
  const backLink = isNext
    ? `<a className="kg-w-back" href="/">← Back</a>`
    : `<Link className="kg-w-back" to="/">← Back</Link>`;

  // The login page shares the home page's exact void + water/dot-grid canvas,
  // paper-card treatment, and katana footer — all from the generator-side helpers
  // above, inlined (not imported at runtime). It only wraps the EXISTING
  // features/login LoginForm in a paper panel; the form's fields, zod schema, and
  // submit behaviour are untouched.
  const body = `${clientDirective}${fonts.importLine}import { useRef, useEffect } from 'react';
${routerImport}import { LoginForm } from '@features/login';

const REPO = 'https://github.com/AkramAlmnajed/kirigami';

const loginStyles = \`${sharedThemeCss(fonts.mono, fonts.serif, fonts.cssImport)}\`;

export function LoginPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
${waterCanvasEffect()}
  }, []);

  return (
    <div className=${fonts.rootClass}>
      <style dangerouslySetInnerHTML={{ __html: loginStyles }} />
      <canvas ref={canvasRef} className="kg-w-canvas" aria-hidden="true" />
      <div className="kg-w-shell">
        ${backLink}
        <div className="kg-w-panel">
          <LoginForm />
        </div>
${footerBlock()}
      </div>
    </div>
  );
}
`;
  return [
    { path: `${dir}/ui/login-page.tsx`, contents: body },
    { path: `${dir}/index.ts`, contents: `export { LoginPage } from './ui/login-page';\n` },
  ];
}

export function layerFiles(cfg: LayerConfig, answers: WizardAnswers): FileSpec[] {
  const pages = cfg.pagesDir;
  const { styling, framework } = answers;
  const framer = answers.animations === 'framer-motion';
  const i18n = answers.i18n === 'react-i18next';
  const files: FileSpec[] = [];

  files.push(...buttonFiles(styling, framework));
  files.push(sharedUiBarrel(framer, i18n));
  files.push({
    path: 'src/shared/README.md',
    contents: layerReadme('shared', LAYER_DOCS.shared),
  });

  files.push(...homePageFiles(answers, pages));
  files.push(...loginPageFiles(pages, framework));

  const pagesBlurb =
    pages === 'views'
      ? 'The FSD "pages" layer — named `views` in this Next.js template so it does ' +
        'not collide with the Next.js `src/pages` Router. (The Vite template keeps ' +
        'the canonical name `pages`.) Full screens composed from widgets, features, ' +
        'and entities.'
      : 'The FSD "pages" layer (canonical name). Full screens composed from widgets, ' +
        'features, and entities. (The Next.js template renames this layer to `views` ' +
        'to avoid colliding with the Next.js `src/pages` Router.)';
  let pagesReadme = layerReadme(pages, pagesBlurb);
  if (pages === 'views') {
    pagesReadme += `
## ⚠️ Steiger blind spot (Next.js)

Steiger only understands the canonical FSD layer name \`pages\`, so it does
**not** recognise this \`views\` folder. That means it cannot count references
that flow from these pages into \`features\`, \`widgets\`, or \`entities\`.

As a result, Steiger's \`insignificant-slice\` rule would falsely report any
feature you use only from a page here as _"This slice has no references."_ For
that reason that single rule is turned off in \`steiger.config.ts\` (all other
rules stay on). See the loud comment in \`steiger.config.ts\` and the note in the
project README. This does not affect the Vite template, which uses \`pages\`.
`;
  }
  files.push({ path: `src/${pages}/README.md`, contents: pagesReadme });

  for (const name of ['widgets', 'entities'] as const) {
    files.push({
      path: `src/${name}/README.md`,
      contents: layerReadme(name, LAYER_DOCS[name]),
    });
  }

  return files;
}
