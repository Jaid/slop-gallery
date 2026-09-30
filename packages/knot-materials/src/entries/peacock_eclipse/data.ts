import type {KnotData} from '../../types.ts'

// Mage run: CyxjCrlY15yEfmL; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'peacock_eclipse',
  candidateId: 'claude_sonnet',
  title: 'Peacock Eclipse',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'A thousand barbs hold no pigment, only geometry – and every eye that opens is looking back at you.',
  placeholder: {
    color: '#0f6f47',
    shading: 'fabric',
  },
} as const satisfies KnotData
