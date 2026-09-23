import type {KnotData} from '../../types.ts'

export default {
  id: 'polar_nocturne',
  candidateId: 'glm',
  title: 'Polar Nocturne',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'The long night keeps its own music in bands of cold color.',
  placeholder: {
    color: '#54ff9e',
    shading: 'smooth',
  },
} as const satisfies KnotData
