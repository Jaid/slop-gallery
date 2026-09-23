import type {KnotData} from '../../types.ts'

export default {
  id: 'solar_silk',
  candidateId: 'glm',
  title: 'Solar Silk',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Threads of afternoon light slide across a cloth woven for the sun.',
  placeholder: {
    color: '#ffe6b0',
    shading: 'fabric',
  },
} as const satisfies KnotData
