import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cymatic_resonance',
  number: 181,
  title: 'Cymatic Resonance',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#d4af37',
  highlighted: false,
} as const satisfies KnotData
