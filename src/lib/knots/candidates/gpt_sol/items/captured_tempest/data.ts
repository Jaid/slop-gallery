import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'captured_tempest',
  title: 'Captured Tempest',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  accent: '#c8dcff',
  highlighted: false,
} as const satisfies KnotData
