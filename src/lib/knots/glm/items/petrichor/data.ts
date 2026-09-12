import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'petrichor',
  number: 36,
  title: 'Petrichor',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  accent: '#9fd8ff',
  highlighted: false,
} as const satisfies KnotData
