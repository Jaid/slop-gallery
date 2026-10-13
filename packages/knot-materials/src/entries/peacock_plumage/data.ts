import type {KnotData} from '../../types.ts'

// Mage run: KsUDOPCUWqzzKMp; fixture: knot-material-shaders; result: success.
export default {
  id: 'peacock_plumage',
  candidateId: 'muse_wonder',
  title: 'Peacock Plumage',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  flavorText: 'A hundred emerald eyes open along the feather, each one watching the light that watches you.',
  placeholder: {
    color: '#0b3a55',
    shading: 'fabric',
  },
} as const satisfies KnotData
