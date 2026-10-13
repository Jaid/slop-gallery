import type {KnotData} from '../../types.ts'

// Mage run: Am1BnNRHvHbHCa2; fixture: knot-material-shaders; result: success.
export default {
  id: 'morpho_drift',
  candidateId: 'muse_wonder',
  title: 'Morpho Drift',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  displacement: 0.024,
  flavorText: 'A thousand blue wings folded into a single knot; none of them holds any blue, yet every step you take sets them flying.',
  placeholder: {
    color: '#194fa9',
    shading: 'glass',
  },
} as const satisfies KnotData
