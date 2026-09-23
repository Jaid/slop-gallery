import type {KnotData} from '../../types.ts'

export default {
  id: 'jovian_vortex',
  candidateId: 'claude_opus',
  title: 'Jovian Vortex',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 4.6 Thinking',
      slug: 'anthropic/claude-opus-4-6-thinking',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A gas giant\'s soul wrapped around the knot, belts of ammonia cream shearing into watchful spirals.',
  displacement: 0.01,
  placeholder: {
    color: '#c68a5d',
    shading: 'smooth',
  },
} as const satisfies KnotData
