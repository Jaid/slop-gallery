import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'clockwork_heart',
  number: 144,
  title: 'Clockwork Heart',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  accent: '#e0a93e',
  highlighted: false,
} as const satisfies KnotData
