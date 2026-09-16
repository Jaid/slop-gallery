import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'frost_lattice',
  title: 'Frost Lattice',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  accent: '#cfe8ff',
  displacement: 0.004,
  highlighted: false,
} as const satisfies KnotData
