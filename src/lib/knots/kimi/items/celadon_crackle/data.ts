import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'celadon_crackle',
  number: 164,
  title: 'Celadon Crackle',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3 Max',
      effortLevel: 'max',
    },
  },
  accent: '#b7e3cd',
  highlighted: false,
} as const satisfies KnotData
