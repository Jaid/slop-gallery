import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'phase_ghost',
  number: 96,
  title: 'Phase Ghost',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1'
    }
  },
  accent: '#8cf5ff',
  highlighted: true
} as const satisfies KnotData
