import type {KnotData} from '../../types.ts'

// Mage run: Cp16WUQoUlMTqRD; fixture: knot-material-shaders; result: success.
export default {
  id: 'sylvan_relic',
  candidateId: 'muse_wonder',
  title: 'Sylvan Relic',
  createdAt: 1_791_848_243,
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.03,
  flavorText: 'Stone forgot the temple it was, and the forest, patient as weather, grew a softer monument over it.',
  placeholder: {
    color: '#63714d',
    shading: 'stone',
  },
} as const satisfies KnotData
