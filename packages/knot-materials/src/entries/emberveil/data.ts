import type {KnotData} from '../../types.ts'

// Mage run: GsOIgdKyNa5oEPr; fixture: knot-material-shaders; result: success.
export default {
  id: 'emberveil',
  candidateId: 'muse_wonder',
  title: 'Emberveil',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'high',
    },
  },
  displacement: 0.018,
  flavorText: 'A black basalt skin cools over living fire; step closer and a bright surge runs the cracks, hunting the seam.',
  placeholder: {
    color: '#601e10',
    shading: 'stone',
  },
} as const satisfies KnotData
