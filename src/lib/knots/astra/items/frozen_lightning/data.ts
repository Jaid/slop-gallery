import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'frozen_lightning',
  number: 7,
  title: 'Frozen Lightning',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  accent: '#98baff',
  highlighted: false,
} as const satisfies KnotData
