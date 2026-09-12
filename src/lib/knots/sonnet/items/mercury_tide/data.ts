import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mercury_tide',
  title: 'Mercury Tide',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  accent: '#d7dbe3',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
