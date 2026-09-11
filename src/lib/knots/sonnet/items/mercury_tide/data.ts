import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mercury_tide',
  number: 14,
  title: 'Mercury Tide',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  accent: '#d7dbe3',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
