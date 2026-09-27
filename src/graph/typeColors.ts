import { NODE_TYPE_LABELS } from '../data/types';
import type { NodeType } from '../data/types';

// Validated 12-type palette, derived from ColorBrewer Paired (the seed's
// placeholder hues) by moving each colour's HSL lightness into the band that
// clears 3:1 on both surfaces (dark #070b14 / light #f3f5fa):
// physical_system 3.37/5.36, property 4.10/4.41, phenomenon 5.57/3.24,
// model_regime 3.18/5.67, conditions 5.41/3.33, formalism 3.54/5.10,
// equation 3.55/5.08, method 5.60/3.22, experiment 5.41/3.33,
// learning_goal 5.42/3.33, resource 5.79/3.12, misconception 3.08/5.86.
// Paired's hue families are kept (pale member → lighter, saturated member →
// darker), so related types still read as siblings; the closest pair
// (ΔE76 in Lab) is conditions/formalism at 13.4, a deliberate same-family
// pair. Twelve hues cannot all be CVD-safe pairwise — every node carries a
// visible text label, the legend names every type and the card states the
// type in text; shape-per-type is the pathway (Decision 13).
export const TYPE_COLORS: Record<NodeType, string> = {
  physical_system: '#c81719',
  property: '#b45900',
  phenomenon: '#8d8d07',
  model_regime: '#7b47b3',
  conditions: '#1d8eca',
  formalism: '#1c6da4',
  equation: '#267821',
  method: '#5c9826',
  experiment: '#aa6ec8',
  learning_goal: '#f04a49',
  resource: '#c27c05',
  misconception: '#8b502e',
};

export const TYPE_ORDER = Object.keys(NODE_TYPE_LABELS) as NodeType[];
