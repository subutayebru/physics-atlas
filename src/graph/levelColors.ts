import type { TopicLevel } from '../data/types';

// Validated categorical palette (dataviz six-checks, dark surface #0d1220):
// all four ≥3:1 on the surface, worst adjacent CVD ΔE 13.4. Every node also
// carries a visible label, so color never encodes alone.
export const LEVEL_COLORS: Record<TopicLevel, string> = {
  foundation: '#199e70',
  core: '#3987e5',
  advanced: '#d55181',
  goal: '#d95926',
};

export const LEVEL_LABELS: Record<TopicLevel, string> = {
  foundation: 'Foundation (math)',
  core: 'Core physics',
  advanced: 'Advanced',
  goal: 'Goal topic',
};

export const LEVEL_ORDER: TopicLevel[] = ['foundation', 'core', 'advanced', 'goal'];
