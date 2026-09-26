import type {KnotData} from '../../types.ts'

// Mage run: IgNMLTcxWnW8Pin; fixture: knot-material-shaders.
export default {
  id: 'ctenophore_nocturne',
  candidateId: 'claude_opus',
  title: 'Ctenophore Nocturne',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  displacement: 0.006,
  flavorText: 'Eight rows of beating combs pour rainbows down a body of living glass. Lean closer and the abyss answers in blue.',
  placeholder: {
    color: '#0b1a4a',
    shading: 'glass',
  },
} as const satisfies KnotData
