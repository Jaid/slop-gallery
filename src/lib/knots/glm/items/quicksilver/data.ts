import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quicksilver',
  number: 39,
  title: 'Quicksilver',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  accent: '#dfe8f2',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
