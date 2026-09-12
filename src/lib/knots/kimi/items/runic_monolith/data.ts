import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'runic_monolith',
  number: 169,
  title: 'Runic Monolith',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3 Max',
      effortLevel: 'max',
    },
  },
  accent: '#43ffd0',
  highlighted: false,
} as const satisfies KnotData
