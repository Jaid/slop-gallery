import type {KnotData} from '../../types.ts'

export default {
  id: 'stardust_relic',
  candidateId: 'glm',
  title: 'Stardust Relic',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Fine cosmic dust clings to an object older than its present constellation.',
  placeholder: {
    color: '#bcd7ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
