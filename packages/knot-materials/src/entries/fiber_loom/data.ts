import type {KnotData} from '../../types.ts'

export default {
  id: 'fiber_loom',
  candidateId: 'claude_opus',
  title: 'Fiber Loom',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 4.6 Thinking',
      slug: 'anthropic/claude-opus-4-6-thinking',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Woven from threads of frozen light, each fiber carries a pulse that has forgotten where it began.',
  placeholder: {
    color: '#42577d',
    shading: 'fabric',
  },
} as const satisfies KnotData
