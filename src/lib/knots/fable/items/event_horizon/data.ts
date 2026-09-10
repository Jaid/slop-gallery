import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'event_horizon',
  number: 89,
  title: 'Event Horizon',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1'
    }
  },
  accent: '#ff8a3d',
  highlighted: true
} as const satisfies KnotData
