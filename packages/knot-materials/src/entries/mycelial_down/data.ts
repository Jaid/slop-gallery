import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mycelial_down',
  candidateId: 'claude_opus',
  title: 'Mycelial Down',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Soft fungal threads gather like a pale breath along the dark.',
  placeholder: {
    color: '#9cf5c8',
    shading: 'fabric',
  },
} as const satisfies KnotData
