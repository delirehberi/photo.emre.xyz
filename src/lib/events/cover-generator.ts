/**
 * Generative Event Cover Engine
 *
 * Deterministically generates vibrant, distinctive, and accessible cover art
 * for Nostr event albums that lack a cover image.
 */

export type CoverPatternType =
  'orbital' | 'waves' | 'mesh' | 'aurora' | 'beams' | 'constellation';

export interface CoverPalette {
  id: string;
  name: string;
  gradient: [string, string, string]; // [start, mid, end]
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  monogramColor: string;
}

export interface GeneratedCoverData {
  seed: string;
  palette: CoverPalette;
  patternType: CoverPatternType;
  monogram: string;
  svgElements: {
    gradientAngle: number;
    shapes: Array<{
      type: 'circle' | 'path' | 'polygon' | 'line';
      attributes: Record<string, string | number | undefined>;
    }>;
  };
}

/**
 * Curated list of 12 vibrant, high-contrast color palettes.
 * Designed to feel premium, energetic, and visually balanced on both light/dark surfaces.
 */
export const COVER_PALETTES: readonly CoverPalette[] = [
  {
    id: 'sunset-radiant',
    name: 'Sunset Radiant',
    gradient: ['#701a75', '#e11d48', '#f59e0b'],
    primary: '#e11d48',
    secondary: '#f59e0b',
    accent: '#fde047',
    glow: 'rgba(245, 158, 11, 0.4)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    gradient: ['#1e1b4b', '#7c3aed', '#06b6d4'],
    primary: '#7c3aed',
    secondary: '#06b6d4',
    accent: '#a5f3fc',
    glow: 'rgba(6, 182, 212, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.16)',
    badgeBorder: 'rgba(255, 255, 255, 0.32)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'emerald-aurora',
    name: 'Emerald Aurora',
    gradient: ['#064e3b', '#059669', '#34d399'],
    primary: '#059669',
    secondary: '#34d399',
    accent: '#a7f3d0',
    glow: 'rgba(52, 211, 153, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    gradient: ['#450a0a', '#ea580c', '#fbbf24'],
    primary: '#ea580c',
    secondary: '#fbbf24',
    accent: '#fef08a',
    glow: 'rgba(251, 191, 36, 0.5)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'cosmic-violet',
    name: 'Cosmic Violet',
    gradient: ['#18181b', '#9333ea', '#ec4899'],
    primary: '#9333ea',
    secondary: '#ec4899',
    accent: '#fbcfe8',
    glow: 'rgba(236, 72, 153, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.16)',
    badgeBorder: 'rgba(255, 255, 255, 0.32)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'oceanic-depths',
    name: 'Oceanic Depths',
    gradient: ['#082f49', '#0284c7', '#38bdf8'],
    primary: '#0284c7',
    secondary: '#38bdf8',
    accent: '#bae6fd',
    glow: 'rgba(56, 189, 248, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'electric-berry',
    name: 'Electric Berry',
    gradient: ['#4c0519', '#be123c', '#fb7185'],
    primary: '#be123c',
    secondary: '#fb7185',
    accent: '#fecdd3',
    glow: 'rgba(251, 113, 133, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'neo-matrix',
    name: 'Neo Matrix',
    gradient: ['#022c22', '#16a34a', '#a3e635'],
    primary: '#16a34a',
    secondary: '#a3e635',
    accent: '#d9f99d',
    glow: 'rgba(163, 230, 53, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'golden-ochre',
    name: 'Golden Ochre',
    gradient: ['#451a03', '#b45309', '#facc15'],
    primary: '#b45309',
    secondary: '#facc15',
    accent: '#fef9c3',
    glow: 'rgba(250, 204, 21, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'arctic-glacier',
    name: 'Arctic Glacier',
    gradient: ['#0f172a', '#0891b2', '#2dd4bf'],
    primary: '#0891b2',
    secondary: '#2dd4bf',
    accent: '#99f6e4',
    glow: 'rgba(45, 212, 191, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'royal-indigo',
    name: 'Royal Indigo',
    gradient: ['#2e1065', '#6366f1', '#c084fc'],
    primary: '#6366f1',
    secondary: '#c084fc',
    accent: '#e9d5ff',
    glow: 'rgba(192, 132, 252, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
  {
    id: 'vivid-crimson',
    name: 'Vivid Crimson',
    gradient: ['#3b0764', '#c026d3', '#f43f5e'],
    primary: '#c026d3',
    secondary: '#f43f5e',
    accent: '#fecdd3',
    glow: 'rgba(244, 63, 94, 0.45)',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeBorder: 'rgba(255, 255, 255, 0.35)',
    badgeText: '#ffffff',
    monogramColor: '#ffffff',
  },
] as const;

export const COVER_PATTERN_TYPES: readonly CoverPatternType[] = [
  'orbital',
  'waves',
  'mesh',
  'aurora',
  'beams',
  'constellation',
] as const;

/**
 * 32-bit FNV-1a Hash function
 * Computes a fast, uniform 32-bit integer for any input string.
 */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Generates a floating point number in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a floating point number in [min, max)
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates an integer in [min, max]
   */
  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Picks a random item from an array
   */
  choice<T>(items: readonly T[]): T {
    const idx = Math.floor(this.next() * items.length);
    return items[idx];
  }
}

/**
 * Extracts a concise 1-2 character monogram from an event title.
 * Handles Turkish locale, numbers, hyphens, and accents cleanly.
 */
export function extractMonogram(title?: string | null): string {
  if (!title || typeof title !== 'string') {
    return 'EV';
  }

  const cleaned = title
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // Keep unicode letters, numbers, spaces, hyphens
    .trim();

  if (!cleaned) {
    return 'EV';
  }

  // Split on spaces and hyphens
  const words = cleaned.split(/[\s-]+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return 'EV';
  }

  if (words.length === 1) {
    const word = words[0];
    if (word.length >= 2) {
      return (word[0] + word[1]).toLocaleUpperCase('tr-TR');
    }
    return word[0].toLocaleUpperCase('tr-TR');
  }

  // If multiple words, combine first letters of first and second word
  const first = words[0][0];
  const second = words[1][0];
  return (first + second).toLocaleUpperCase('tr-TR');
}

/**
 * Generates SVG geometric elements based on pattern type and seeded RNG.
 */
function generatePatternShapes(
  patternType: CoverPatternType,
  rng: SeededRNG,
  palette: CoverPalette,
): Array<{
  type: 'circle' | 'path' | 'polygon' | 'line';
  attributes: Record<string, string | number | undefined>;
}> {
  const shapes: Array<{
    type: 'circle' | 'path' | 'polygon' | 'line';
    attributes: Record<string, string | number | undefined>;
  }> = [];

  switch (patternType) {
    case 'orbital': {
      const cx = rng.intRange(100, 300);
      const cy = rng.intRange(80, 180);
      const count = rng.intRange(4, 6);

      for (let i = 1; i <= count; i++) {
        const r = i * rng.intRange(35, 55);
        shapes.push({
          type: 'circle',
          attributes: {
            cx,
            cy,
            r,
            fill: 'none',
            stroke: i % 2 === 0 ? palette.accent : '#ffffff',
            strokeWidth: rng.range(1, 2.5).toFixed(1),
            opacity: (0.15 + (i / count) * 0.25).toFixed(2),
            strokeDasharray:
              i % 2 === 0
                ? `${rng.intRange(8, 20)} ${rng.intRange(4, 12)}`
                : undefined,
          },
        });
      }
      shapes.push({
        type: 'circle',
        attributes: {
          cx,
          cy,
          r: rng.intRange(8, 16),
          fill: palette.secondary,
          opacity: '0.6',
        },
      });
      break;
    }

    case 'waves': {
      const waveCount = rng.intRange(3, 5);
      for (let i = 0; i < waveCount; i++) {
        const yStart = 30 + i * 45 + rng.range(-15, 15);
        const cp1x = rng.intRange(80, 150);
        const cp1y = yStart + rng.intRange(-50, 50);
        const cp2x = rng.intRange(220, 320);
        const cp2y = yStart + rng.intRange(-50, 50);
        const yEnd = yStart + rng.intRange(-30, 30);

        const d = `M -20 ${yStart} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, 420 ${yEnd}`;
        shapes.push({
          type: 'path',
          attributes: {
            d,
            fill: 'none',
            stroke: i % 2 === 0 ? palette.secondary : '#ffffff',
            strokeWidth: rng.range(1.5, 3.5).toFixed(1),
            opacity: (0.2 + (i / waveCount) * 0.35).toFixed(2),
          },
        });
      }
      break;
    }

    case 'mesh': {
      const cols = 4;
      const rows = 3;
      const cellW = 400 / cols;
      const cellH = 250 / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rng.next() > 0.45) {
            const x = c * cellW;
            const y = r * cellH;
            const skew = rng.range(-15, 15);
            const points = `${x + skew},${y} ${x + cellW + skew},${y + cellH * 0.3} ${x + cellW * 0.8},${y + cellH} ${x},${y + cellH * 0.7}`;
            shapes.push({
              type: 'polygon',
              attributes: {
                points,
                fill: rng.next() > 0.5 ? palette.accent : '#ffffff',
                opacity: rng.range(0.08, 0.22).toFixed(2),
              },
            });
          }
        }
      }
      break;
    }

    case 'aurora': {
      const orbCount = rng.intRange(3, 5);
      for (let i = 0; i < orbCount; i++) {
        shapes.push({
          type: 'circle',
          attributes: {
            cx: rng.intRange(40, 360),
            cy: rng.intRange(30, 220),
            r: rng.intRange(50, 110),
            fill: i % 2 === 0 ? palette.secondary : palette.accent,
            opacity: rng.range(0.2, 0.45).toFixed(2),
            isBlurred: 1,
          },
        });
      }
      break;
    }

    case 'beams': {
      const beamCount = rng.intRange(4, 7);
      for (let i = 0; i < beamCount; i++) {
        const xOffset = rng.intRange(-50, 350);
        const width = rng.intRange(25, 75);
        const skew = rng.intRange(40, 80);

        const points = `${xOffset},0 ${xOffset + width},0 ${xOffset + width + skew},250 ${xOffset + skew},250`;
        shapes.push({
          type: 'polygon',
          attributes: {
            points,
            fill: i % 2 === 0 ? palette.secondary : '#ffffff',
            opacity: rng.range(0.08, 0.25).toFixed(2),
          },
        });
      }
      break;
    }

    case 'constellation': {
      const nodeCount = rng.intRange(10, 15);
      const nodes: Array<{ x: number; y: number }> = [];

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: rng.intRange(30, 370),
          y: rng.intRange(25, 225),
        });
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 95) {
            shapes.push({
              type: 'line',
              attributes: {
                x1: nodes[i].x,
                y1: nodes[i].y,
                x2: nodes[j].x,
                y2: nodes[j].y,
                stroke: palette.accent,
                strokeWidth: '1',
                opacity: (0.15 + (1 - dist / 95) * 0.35).toFixed(2),
              },
            });
          }
        }
      }

      for (const node of nodes) {
        shapes.push({
          type: 'circle',
          attributes: {
            cx: node.x,
            cy: node.y,
            r: rng.range(2, 4.5).toFixed(1),
            fill: '#ffffff',
            opacity: '0.7',
          },
        });
      }
      break;
    }
  }

  return shapes;
}

/**
 * Main generator function.
 * Given an event seed (coordinate, id, or title) and optional title,
 * returns deterministic cover palette, pattern type, SVG elements, and monogram.
 */
export function generateEventCover(
  seedInput: string,
  title?: string | null,
): GeneratedCoverData {
  const effectiveSeed = (seedInput || title || 'default-event').trim();
  const hash = hashSeed(effectiveSeed);
  const rng = new SeededRNG(hash);

  const paletteIndex = hash % COVER_PALETTES.length;
  const palette = COVER_PALETTES[paletteIndex];

  const patternTypeIndex =
    Math.floor(hash / COVER_PALETTES.length) % COVER_PATTERN_TYPES.length;
  const patternType = COVER_PATTERN_TYPES[patternTypeIndex];

  const gradientAngle = rng.intRange(30, 150);
  const shapes = generatePatternShapes(patternType, rng, palette);
  const monogram = extractMonogram(title || seedInput);

  return {
    seed: effectiveSeed,
    palette,
    patternType,
    monogram,
    svgElements: {
      gradientAngle,
      shapes,
    },
  };
}
