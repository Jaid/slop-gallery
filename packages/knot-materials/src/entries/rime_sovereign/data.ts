import type {KnotData} from '../../types.ts'

// Mage run: ImzJ438LsWTlcom; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'rime_sovereign',
  candidateId: 'claude_haiku',
  title: 'Rime Sovereign',
  createdAt: 1_791_759_582,
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Haiku 5.5',
      slug: 'anthropic/claude-haiku-5.5',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Overnight the cold writes a crown of facets, and each one holds a different star until the thaw.',
  placeholder: {
    color: '#bedced',
    shading: 'glass',
  },
} as const satisfies KnotData
