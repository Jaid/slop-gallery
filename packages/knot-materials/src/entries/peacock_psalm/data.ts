import type {KnotData} from '../../types.ts'

// Mage run: Cp16WUQoUlMTqRD; fixture: knot-material-shaders; result: success.
export default {
  id: 'peacock_psalm',
  candidateId: 'muse_wonder',
  title: 'Peacock Psalm',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A hundred eyes open along one feathered body, and every eye changes its mind as you walk around it.',
  placeholder: {
    color: '#59787a',
    shading: 'fabric',
  },
} as const satisfies KnotData
