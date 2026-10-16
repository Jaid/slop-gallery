import type {KnotData} from '../../types.ts'

export default {
  id: 'emberheart',
  candidateId: 'glm',
  title: 'Emberheart',
  createdAt: 1_789_094_423,
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'The surface has cooled, but something inside still keeps the beat.',
  placeholder: {
    color: '#ff5e2b',
    shading: 'smooth',
  },
} as const satisfies KnotData
