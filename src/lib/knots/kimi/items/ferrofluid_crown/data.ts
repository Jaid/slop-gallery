import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrofluid_crown',
  number: 167,
  title: 'Ferrofluid Crown',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3 Max',
      effortLevel: 'max',
    },
  },
  accent: '#6f7dff',
  highlighted: false,
} as const satisfies KnotData
