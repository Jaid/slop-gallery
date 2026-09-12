import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'pallid_chrysalis',
  number: 173,
  title: 'Pallid Chrysalis',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Meta Muse Thinking',
    },
  },
  accent: '#ffb08a',
  highlighted: false,
} as const satisfies KnotData
