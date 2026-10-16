import type {KnotData} from '../../types.ts'

export default {
  id: 'neon_meridian',
  candidateId: 'glm',
  title: 'Neon Meridian',
  createdAt: 1_789_094_423,
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'A bright line divides the night into before and after.',
  placeholder: {
    color: '#54ffd2',
    shading: 'smooth',
  },
} as const satisfies KnotData
