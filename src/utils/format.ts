export function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

const graphemes =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function splitEmojis(s: string): string[] {
  const str = (s || '').trim();
  if (!str) return [];
  const parts = graphemes
    ? Array.from(graphemes.segment(str), (seg) => seg.segment)
    : Array.from(str);
  return parts.filter((g) => g.trim().length > 0);
}
