import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'polar_nocturne',
  number: 140,
  title: 'Polar Nocturne',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  accent: '#54ff9e',
  highlighted: false,
} as const satisfies KnotData
