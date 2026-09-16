import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrofluid_crown',
  title: 'Ferrofluid Crown',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  accent: '#6f7dff',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
