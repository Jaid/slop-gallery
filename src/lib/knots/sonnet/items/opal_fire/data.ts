import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'opal_fire',
  number: 15,
  title: 'Opal Fire',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  accent: '#ffb6e6',
  highlighted: true,
} as const satisfies KnotData
