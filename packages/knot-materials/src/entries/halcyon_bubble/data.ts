import type {KnotData} from '../../types.ts'

// Mage run: CyxjCrlY15yEfmL; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'halcyon_bubble',
  candidateId: 'claude_sonnet',
  title: 'Halcyon Bubble',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'A held breath, thinner than a thought, paints the whole sky in slow rivers of borrowed color.',
  placeholder: {
    color: '#7ac9ff',
    shading: 'glass',
  },
} as const satisfies KnotData
