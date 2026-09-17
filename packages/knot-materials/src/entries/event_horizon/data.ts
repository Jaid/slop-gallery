import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'event_horizon',
  candidateId: 'claude_fable',
  title: 'Event Horizon',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Beyond this dark border, even the light forgets its way home.',
  placeholder: {
    color: '#ff8a3d',
    shading: 'ghost',
  },
} as const satisfies KnotData
