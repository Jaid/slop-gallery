import type {KnotData} from '../../types.ts'

export default {
  id: 'lightless_border',
  candidateId: 'claude_fable',
  title: 'Lightless Border',
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
