import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'saffron_cathedral',
  title: 'Saffron Cathedral',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  accent: '#ffc25c',
  highlighted: false,
} as const satisfies KnotData
