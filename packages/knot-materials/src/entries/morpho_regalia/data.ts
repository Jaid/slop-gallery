import type {KnotData} from '../../types.ts'

export default {
  id: 'morpho_regalia',
  candidateId: 'glm',
  title: 'Morpho Regalia',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Blue wings lend their splendor to a crown lighter than air.',
  placeholder: {
    color: '#54d8ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
