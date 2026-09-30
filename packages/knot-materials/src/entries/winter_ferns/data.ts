import type {KnotData} from '../../types.ts'

// Mage run: CyxjCrlY15yEfmL; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'winter_ferns',
  candidateId: 'claude_sonnet',
  title: 'Winter Ferns',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'Winter drew ferns across the glass in one long night, and your breath has begun to erase them.',
  placeholder: {
    color: '#b9d8f4',
    shading: 'glass',
  },
} as const satisfies KnotData
