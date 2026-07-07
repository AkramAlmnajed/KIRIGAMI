/**
 * The KIRIGAMI banner + katana mark, with the one-time slice-reveal intro.
 *
 * Katana (final design, character by character):
 *   ◈◇◈◇◈  cord-wrap — ◈ gold menuki studs, ◇ dim green
 *   ╪      habaki (blade collar), gold — a genuinely gold fitting on real swords
 *   ▬▬ι    blade base, thick→thin — continues the banner's green→cyan gradient
 *   ═══…   blade body (shinogi ridge) — same gradient field
 *   ➤      the tip — cyan glint
 *
 * Intro (TTY only): banner + katana rows start as dim scrambled glyphs; a
 * slice-wipe sweeps left→right resolving each column. Resolved columns
 * COLOR-DRIFT through 3 intermediate hues in their own family (green/cyan for
 * gradient chars, gold tones for fittings, green tones for dim chars) before
 * settling on the exact final color. One-time only; the settled frame is
 * static forever. Exactly-once + non-TTY logic lives in intro.ts.
 *
 * The gradient is the same ramp ink-gradient produced (#00FF41 → #00E5FF,
 * endpoints byte-verified in Phase 1), computed per column so the blade can
 * sample the identical gradient field at its own column positions.
 */
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import figlet from 'figlet';
import { SUBTITLE, BANNER_GRADIENT, COLORS } from '../constants.js';
import { shouldAnimateIntro, markIntroPlayed } from './intro.js';

const ROWS = figlet
  .textSync('KIRIGAMI', { font: 'ANSI Shadow' })
  .split('\n')
  .filter((r) => r.trim().length > 0);
const WIDTH = Math.max(...ROWS.map((r) => r.length));
const ART = ROWS.map((r) => r.padEnd(WIDTH));

/** Terminal display width: CJK ideographs/kana render 2 columns wide. */
function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6);
    w += wide ? 2 : 1;
  }
  return w;
}

/** Center a line within the banner's rendered width (not the terminal's). */
export function centerInBanner(s: string): string {
  return ' '.repeat(Math.max(0, Math.floor((WIDTH - displayWidth(s)) / 2))) + s;
}

// ---------------------------------------------------------------- colors --
type RGB = [number, number, number];
const hex = (s: string): RGB => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];
const toHex = (c: RGB): string =>
  `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const mix = (a: RGB, b: RGB, t: number): RGB =>
  [0, 1, 2].map((k) => Math.round(a[k] * (1 - t) + b[k] * t)) as RGB;

/** Per-column banner gradient (#00FF41 → #00E5FF). */
const [G_START, G_END] = [hex(BANNER_GRADIENT[0]), hex(BANNER_GRADIENT[1])];
const COLUMN_COLORS: string[] = Array.from({ length: WIDTH }, (_, col) =>
  toHex(mix(G_START, G_END, WIDTH <= 1 ? 0 : col / (WIDTH - 1)))
);

/**
 * Color-drift: a resolving column passes through 3 intermediate hues in its
 * color family before landing exactly on the final color (never afterwards).
 *   age 0: 50% toward black (dark ember of the final hue)
 *   age 1: 45% toward the family partner (the hue swing)
 *   age 2: 15% toward black (almost there)
 *   age 3+: exact final color
 */
type Family = 'grad' | 'gold' | 'dim' | 'cyan';
const PARTNER: Record<Family, RGB> = {
  grad: hex('#00E5FF'), // green chars swing toward cyan
  gold: hex('#F5D76E'), // gold swings bright
  dim: hex('#58B368'), // dim green swings lighter
  cyan: hex('#00FF41'), // the tip swings toward green (its gradient neighbor)
};
const DRIFT_STAGES = 3;
function drift(finalHex: string, family: Family, age: number): string {
  if (age >= DRIFT_STAGES) return finalHex;
  const f = hex(finalHex);
  if (age === 0) return toHex(mix(f, [0, 0, 0], 0.5));
  if (age === 1) return toHex(mix(f, PARTNER[family], 0.45));
  return toHex(mix(f, [0, 0, 0], 0.15));
}

// ---------------------------------------------------------------- katana --
const KATANA = '◈◇◈◇◈╪▬▬ι═══════════➤';
/** Leading spaces that center the mark within the banner's width. */
const KATANA_PAD = Math.max(0, Math.floor((WIDTH - KATANA.length) / 2));
function katanaFinal(i: number): { color: string; family: Family } {
  if (i <= 4) {
    // cord-wrap: gold menuki (◈) alternating with dim ◇
    return i % 2 === 0
      ? { color: COLORS.gold, family: 'gold' }
      : { color: COLORS.dim, family: 'dim' };
  }
  if (i === 5) return { color: COLORS.gold, family: 'gold' }; // ╪ habaki
  if (i === KATANA.length - 1) return { color: COLORS.accent, family: 'cyan' }; // ➤
  // blade: sample the banner's gradient field at its on-screen column
  return { color: COLUMN_COLORS[KATANA_PAD + i], family: 'grad' };
}

/** Dim "uncut sheet" noise: half-width katakana + box-drawing debris. */
const SCRAMBLE = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ┤┐└┴┬├┼╌╍░▒';

// ------------------------------------------------- ambient drift (Phase 11) --
// After the intro settles, the KIRIGAMI letters (only) breathe: each column's
// interpolation position slides along the SAME green→cyan ramp via a slow
// traveling sine — so every drift color is, by construction, a mix of the two
// brand endpoints (R=0, G∈[229,255], B∈[65,255]). Never leaves the family.
// Runs only in a real TTY session; every timer is unref()ed so it can never
// keep the process alive after Exit.
const AMBIENT_TTY = Boolean(process.stdout.isTTY) && Boolean(process.stdin.isTTY);
const AMBIENT_MS = 115; // ~8.7 fps — still far below animation-loop rates
const AMBIENT_AMP = 0.18; // ±18% along the ramp
const AMBIENT_PHASE_STEP = 0.046; // full wave period ≈ 2.5s (115ms / 0.046)
const AMBIENT_EASE_TICKS = Math.ceil(2000 / AMBIENT_MS); // amplitude ramps in over ~2s
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

function ambientColumnColors(tick: number): string[] {
  const phi = tick * AMBIENT_PHASE_STEP;
  const amp = AMBIENT_AMP * Math.min(1, tick / AMBIENT_EASE_TICKS);
  return Array.from({ length: WIDTH }, (_, i) => {
    const t = WIDTH <= 1 ? 0 : i / (WIDTH - 1);
    const drifted = clamp01(t + amp * Math.sin(2 * Math.PI * (t - phi)));
    return toHex(mix(G_START, G_END, drifted));
  });
}

/**
 * Pre-color a row with raw truecolor codes (emitted only on color change) so
 * each ambient repaint costs ONE Ink <Text> node per row instead of ~53 —
 * at the faster tick rate the per-node React/yoga overhead was the CPU cost.
 */
const ESC = String.fromCharCode(27);
function ansiRow(row: string, colors: string[]): string {
  let out = '';
  let last = '';
  for (let i = 0; i < row.length; i++) {
    const c = colors[i];
    if (c !== last) {
      out += `${ESC}[38;2;${parseInt(c.slice(1, 3), 16)};${parseInt(c.slice(3, 5), 16)};${parseInt(c.slice(5, 7), 16)}m`;
      last = c;
    }
    out += row[i];
  }
  return `${out}${ESC}[39m`;
}

// Nominal 11 ticks × 38ms + 100ms settle ≈ 520ms; Ink render overhead brings
// the real total to ~700ms — measured against the 900ms ceiling in the
// Phase 10 verification.
const FRAME_MS = 38;
const STEP = Math.max(2, Math.ceil(WIDTH / 8));
const SWEEP_TICKS = Math.ceil(WIDTH / STEP);
const END_TICK = SWEEP_TICKS + DRIFT_STAGES; // let the last columns finish drifting
const SETTLE_MS = 100;

/** Final, fully-settled elements — module-level so post-intro renders are stable. */
const FINAL_ART = ART.map((row, r) => (
  <Text key={r}>
    {row.split('').map((c, i) => (
      <Text key={i} color={COLUMN_COLORS[i]}>
        {c}
      </Text>
    ))}
  </Text>
));
const KATANA_LINE = (
  <Text>
    {' '.repeat(KATANA_PAD)}
    {KATANA.split('').map((c, i) => (
      <Text key={i} color={katanaFinal(i).color}>
        {c}
      </Text>
    ))}
  </Text>
);

export default function Banner({
  onDone,
}: {
  onDone?: () => void;
}): React.ReactElement {
  const [animate] = useState(shouldAnimateIntro);
  const [tick, setTick] = useState(animate ? 0 : END_TICK);
  const [done, setDone] = useState(!animate);
  const [ambientTick, setAmbientTick] = useState(0);

  // Advance the reveal (chained timeouts; stops itself at END_TICK).
  // NOTE: intro timers must stay REF'd — during the intro the menu (and its
  // stdin listener) isn't mounted yet, so these timers are the only thing
  // keeping the event loop alive. unref()ing them exits the process mid-intro
  // (found the hard way in Phase 11 verification).
  useEffect(() => {
    if (!animate || tick >= END_TICK) return;
    const t = setTimeout(() => setTick((x) => x + 1), FRAME_MS);
    return () => clearTimeout(t);
  }, [animate, tick]);

  // Settle: brief pause once every column has finished drifting.
  useEffect(() => {
    if (!animate || done || tick < END_TICK) return;
    const t = setTimeout(() => {
      markIntroPlayed();
      setDone(true);
      onDone?.();
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [animate, done, tick, onDone]);

  // Perpetual ambient drift after settle (TTY only). unref() guarantees the
  // timer can never keep the process alive; cleanup clears it on unmount.
  useEffect(() => {
    if (!done || !AMBIENT_TTY) return;
    const t = setTimeout(() => setAmbientTick((n) => n + 1), AMBIENT_MS);
    t.unref?.();
    return () => clearTimeout(t);
  }, [done, ambientTick]);

  if (done) {
    const art = AMBIENT_TTY
      ? (() => {
          const colors = ambientColumnColors(ambientTick);
          return ART.map((row, r) => <Text key={r}>{ansiRow(row, colors)}</Text>);
        })()
      : FINAL_ART;
    return (
      <Box flexDirection="column">
        {art}
        {KATANA_LINE}
        <Text color={COLORS.accent}>{centerInBanner(SUBTITLE)}</Text>
      </Box>
    );
  }

  // Mid-reveal frame. Column i resolves on tick floor(i/STEP)+1; its drift age
  // is how many ticks have passed since then.
  const tip = Math.min(WIDTH, tick * STEP);
  const ageOf = (i: number): number => tick - (Math.floor(i / STEP) + 1);
  const scrambleChar = (): string =>
    Math.random() < 0.55 ? SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0] : ' ';

  return (
    <Box flexDirection="column">
      {ART.map((row, r) => (
        <Text key={r}>
          {row.split('').map((c, i) =>
            i < tip ? (
              <Text key={i} color={drift(COLUMN_COLORS[i], 'grad', ageOf(i))}>
                {c}
              </Text>
            ) : (
              <Text key={i} color={COLORS.dim} dimColor>
                {scrambleChar()}
              </Text>
            )
          )}
        </Text>
      ))}
      <Text>
        {Array.from({ length: WIDTH }, (_, i) => {
          if (i >= tip) {
            return (
              <Text key={i} color={COLORS.dim} dimColor>
                {scrambleChar()}
              </Text>
            );
          }
          const k = i - KATANA_PAD; // katana sits centered on this row
          if (k < 0 || k >= KATANA.length) return <Text key={i}> </Text>;
          const { color, family } = katanaFinal(k);
          return (
            <Text key={i} color={drift(color, family, ageOf(i))}>
              {KATANA[k]}
            </Text>
          );
        })}
      </Text>
    </Box>
  );
}
