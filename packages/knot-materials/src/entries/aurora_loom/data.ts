import type {KnotData} from '../../types.ts'

// Mage run: 0gaFob3tIS0Bvlc; fixture: knot-material-shaders; result: success.
export default {
  id: 'aurora_loom',
  candidateId: 'muse_wonder',
  title: 'Aurora Loom',
  createdAt: 1791844380,
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'high',
    },
  },
  flavorText: 'Night is woven here, not painted. Green curtains breathe along the threads while small stars keep time in the dark between them.',
  placeholder: {
    color: '#47776b',
    shading: 'fabric',
  },
} as const satisfies KnotData
