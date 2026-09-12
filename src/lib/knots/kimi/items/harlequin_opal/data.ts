import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'harlequin_opal',
  number: 168,
  title: 'Harlequin Opal',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3 Max',
      effortLevel: 'max',
    },
  },
  accent: '#ffb3ec',
  highlighted: false,
} as const satisfies KnotData
