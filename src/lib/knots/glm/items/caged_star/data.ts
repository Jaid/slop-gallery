import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'caged_star',
  number: 141,
  title: 'Caged Star',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  accent: '#ffb347',
  highlighted: false,
} as const satisfies KnotData
