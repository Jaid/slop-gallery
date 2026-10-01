import type {KnotData} from '../../types.ts'

// Mage run: 8EWpDkWx6nfkCqt; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'ctenophore_aurora',
  candidateId: 'claude_sonnet',
  title: 'Ctenophore Aurora',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  displacement: 0.004,
  flavorText: 'A ghost of seawater beats eight rows of tiny paddles, and every stroke bends the dark into a running rainbow.',
  placeholder: {
    color: '#3fb8d8',
    shading: 'glass',
  },
} as const satisfies KnotData
