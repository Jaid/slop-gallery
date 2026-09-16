import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cryolite_fracture',
  title: 'Cryolite Fracture',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  accent: '#7fc8ff',
  highlighted: false,
} as const satisfies KnotData
