import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_veil_2',
  number: 162,
  title: 'Aurora Veil',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3 Max',
      effortLevel: 'max',
    },
  },
  accent: '#5ff2b0',
  highlighted: false,
} as const satisfies KnotData
