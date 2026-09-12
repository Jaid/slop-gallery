import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nocturne_opal',
  number: 172,
  title: 'Nocturne Opal',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Meta Muse Thinking',
    },
  },
  accent: '#8a6cff',
  highlighted: false,
} as const satisfies KnotData
