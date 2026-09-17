import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_choir',
  candidateId: 'glm',
  title: 'Abyssal Choir',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'A chorus too deep to hear leaves its harmonies in living light.',
  placeholder: {
    color: '#38d6ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
