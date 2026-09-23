import type {KnotData} from '../../types.ts'

export default {
  id: 'damascus_ember',
  candidateId: 'claude_fable',
  title: 'Damascus Ember',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Folded steel carries a little of the fire that taught it strength.',
  placeholder: {
    color: '#ff6a1a',
    shading: 'metal',
  },
} as const satisfies KnotData
