import type {KnotData} from '../../types.ts'

export default {
  id: 'chladni_resonance',
  candidateId: 'claude_fable',
  title: 'Chladni Resonance',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Silent music teaches pale grains where to gather.',
  placeholder: {
    color: '#e8d8b2',
    shading: 'smooth',
  },
  displacement: 0.006,
} as const satisfies KnotData
