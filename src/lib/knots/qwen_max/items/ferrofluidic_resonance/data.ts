import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrofluidic_resonance',
  title: 'Ferrofluidic Resonance',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#ff00aa',
  highlighted: true,
} as const satisfies KnotData
