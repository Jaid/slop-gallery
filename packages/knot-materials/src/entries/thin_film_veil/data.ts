import type {KnotData} from '../../types.ts'

export default {
  id: 'thin_film_veil',
  candidateId: 'claude_opus',
  title: 'Thin Film Veil',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A film thinner than a breath turns ordinary light into a passing rainbow.',
  placeholder: {
    color: '#c9a8ff',
    shading: 'glass',
  },
} as const satisfies KnotData
