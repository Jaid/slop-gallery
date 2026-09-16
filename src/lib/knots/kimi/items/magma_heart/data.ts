import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'magma_heart',
  title: 'Magma Heart',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  accent: '#ff4d00',
  highlighted: false,
} as const satisfies KnotData
