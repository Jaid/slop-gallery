import type {KnotData} from '../../types.ts'

export default {
  id: 'washi_lantern',
  candidateId: 'claude_fable',
  title: 'Washi Lantern',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Warm light finds its way through the quiet grain of handmade paper.',
  placeholder: {
    color: '#ffb36a',
    shading: 'fabric',
  },
} as const satisfies KnotData
