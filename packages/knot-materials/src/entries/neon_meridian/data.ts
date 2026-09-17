import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'neon_meridian',
  candidateId: 'glm',
  title: 'Neon Meridian',
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
