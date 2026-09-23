import type {KnotData} from '../../types.ts'

export default {
  id: 'raku_crackle',
  candidateId: 'claude_opus',
  title: 'Raku Crackle',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Smoke has found every small opening left by the cooling glaze.',
  placeholder: {
    color: '#0f6b6a',
    shading: 'stone',
  },
} as const satisfies KnotData
