import type {KnotData} from '../../types.ts'

// Mage run: CyxjCrlY15yEfmL; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'gilded_midnight',
  candidateId: 'claude_sonnet',
  title: 'Gilded Midnight',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'What broke was mended in gold, and the mending became the most beautiful part of the night.',
  placeholder: {
    color: '#0b0a12',
    shading: 'smooth',
  },
} as const satisfies KnotData
