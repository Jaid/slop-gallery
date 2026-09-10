import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'hourglass_heart',
  number: 40,
  title: 'Hourglass Heart',
  author: {
    model: {
      title: 'GLM 5.3'
    }
  },
  accent: '#ffb45e',
  highlighted: true
} as const satisfies KnotData
