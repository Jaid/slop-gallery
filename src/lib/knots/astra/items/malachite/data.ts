import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'malachite',
  number: 1,
  title: 'Emerald Heart',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  accent: '#51d4a0',
  highlighted: false,
} as const satisfies KnotData
