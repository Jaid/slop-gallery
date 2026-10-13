import type {KnotData} from '../../types.ts'

// Mage run: Cp16WUQoUlMTqRD; fixture: knot-material-shaders; result: success.
export default {
  id: 'porcelain_moon',
  candidateId: 'muse_wonder',
  title: 'Porcelain Moon',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.005,
  flavorText: 'It broke along moonlit seams and was answered in gold, so every fracture now remembers how to shine.',
  placeholder: {
    color: '#c7c1b8',
    shading: 'smooth',
  },
} as const satisfies KnotData
