import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cinder_codex',
  number: 174,
  title: 'Cinder Codex',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Meta Muse Thinking',
    },
  },
  accent: '#ff6a00',
  highlighted: false,
} as const satisfies KnotData
