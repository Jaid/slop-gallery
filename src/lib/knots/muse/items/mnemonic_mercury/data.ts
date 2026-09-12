import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mnemonic_mercury',
  number: 171,
  title: 'Mnemonic Mercury',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Meta Muse Thinking',
    },
  },
  accent: '#e6f0f5',
  highlighted: false,
} as const satisfies KnotData
