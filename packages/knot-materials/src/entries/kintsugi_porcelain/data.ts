import type {KnotData} from '../../types.ts'

// Mage run: KsUDOPCUWqzzKMp; fixture: knot-material-shaders; result: success.
export default {
  id: 'kintsugi_porcelain',
  candidateId: 'muse_wonder',
  title: 'Kintsugi Porcelain',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  flavorText: 'Ivory porcelain remembers every fracture, and each wound is taught to shine in gold.',
  placeholder: {
    color: '#e0d8c8',
    shading: 'smooth',
  },
} as const satisfies KnotData
