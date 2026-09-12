import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'gravity_well',
  number: 8,
  title: 'Gravity Well',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  accent: '#ffb37a',
  highlighted: false,
} as const satisfies KnotData
