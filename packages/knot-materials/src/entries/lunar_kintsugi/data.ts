import type {KnotData} from '../../types.ts'

// Mage run: MgSdUInR50wESrr; fixture: knot-material-shaders; result: success.
export default {
  id: 'lunar_kintsugi',
  candidateId: 'muse_wonder',
  title: 'Lunar Kintsugi',
  createdAt: 1791858712,
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  flavorText: 'A broken moon, repaired with rivers of gold. The cracks are not hidden; they are the brightest geography the porcelain has ever known.',
  placeholder: {
    color: '#ddd5c3',
    shading: 'smooth',
  },
} as const satisfies KnotData
