import type {KnotData} from '../../types.ts'

// Mage run: 8EWpDkWx6nfkCqt; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'cradle_of_suns',
  candidateId: 'claude_sonnet',
  title: 'Cradle of Suns',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'Inside the glass a cloud of dust is learning to burn. Step sideways and its newborn suns slide past one another.',
  placeholder: {
    color: '#170a3a',
    shading: 'glass',
  },
} as const satisfies KnotData
