import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chladni_resonance',
  title: 'Chladni Resonance',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#e8d8b2',
  highlighted: false,
  displacement: 0.006,
} as const satisfies KnotData
