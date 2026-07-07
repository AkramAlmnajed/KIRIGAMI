/**
 * Intro-animation state. Module scope IS process scope in Node, so this flag
 * guarantees the slice-reveal plays exactly once per launch — screen
 * navigation (menu → About → back) can neither reset it nor remount past it.
 *
 * The animation also requires a real terminal on both ends: piped/CI output
 * (no TTY) skips straight to the final static frame with zero delay.
 */
let played = false;

export function markIntroPlayed(): void {
  played = true;
}

export function shouldAnimateIntro(): boolean {
  return !played && Boolean(process.stdout.isTTY) && Boolean(process.stdin.isTTY);
}
