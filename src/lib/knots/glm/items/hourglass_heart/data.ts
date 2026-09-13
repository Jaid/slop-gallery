import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hourglass_heart',
  title: 'Hourglass Heart',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  accent: '#ffb45e',
  highlighted: false,
} as const satisfies KnotData
