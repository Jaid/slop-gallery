import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'glacial_aurora',
  number: 201,
  title: 'Glacial Aurora',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#2dff9a',
  highlighted: false,
} as const satisfies KnotData
