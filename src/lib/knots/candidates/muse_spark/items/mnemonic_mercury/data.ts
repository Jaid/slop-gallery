import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mnemonic_mercury',
  title: 'Mnemonic Mercury',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  accent: '#e6f0f5',
  highlighted: true,
} as const satisfies KnotData
