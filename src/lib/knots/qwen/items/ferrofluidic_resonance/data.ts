import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrofluidic_resonance',
  number: 179,
  title: 'Ferrofluidic Resonance',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#ff00aa',
  highlighted: false,
} as const satisfies KnotData
