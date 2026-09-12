import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_drift',
  number: 165,
  title: 'Abyssal Drift',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3 Max',
      effortLevel: 'max',
    },
  },
  accent: '#46a0ff',
  highlighted: false,
} as const satisfies KnotData
