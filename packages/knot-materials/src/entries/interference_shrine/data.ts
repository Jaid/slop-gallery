import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'interference_shrine',
  candidateId: 'glm',
  title: 'Interference Shrine',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Crossing waves build a small sanctuary of impossible colors.',
  placeholder: {
    color: '#5ac8ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
