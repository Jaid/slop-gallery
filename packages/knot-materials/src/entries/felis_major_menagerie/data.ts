import type {KnotData} from '../../types.ts'

// Mage run: C9HMqRObyAfKheL; fixture: knot-material-br11k; result: mixed.
export default {
  id: 'felis_major_menagerie',
  candidateId: 'claude_opus',
  title: 'Felis Major Menagerie',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Old star charts left out a few figures: cats of light that watch you pass, forget themselves into stardust and, eyes first, remember.',
  placeholder: {
    color: '#05060d',
    shading: 'smooth',
  },
} as const satisfies KnotData
