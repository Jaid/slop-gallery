import type {KnotData} from '../../types.ts'

export default {
  id: 'damascus_fold',
  candidateId: 'claude_opus',
  title: 'Damascus Fold',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Countless hammer blows have become a landscape of silver currents.',
  placeholder: {
    color: '#d8d2c4',
    shading: 'metal',
  },
} as const satisfies KnotData
