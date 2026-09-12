import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_chromatophore',
  number: 197,
  title: 'Abyssal Chromatophore',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#2fe8ff',
  highlighted: false,
} as const satisfies KnotData
