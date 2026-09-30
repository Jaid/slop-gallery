import type {KnotData} from '../../types.ts'

// Mage run: 1o1ree11eGriGjv; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'gilded_moon',
  candidateId: 'claude_sonnet',
  title: 'Gilded Moon',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'It shattered once, and was mended in gold. Now every wound is the brightest thing in the room.',
  placeholder: {
    color: '#9d9584',
    shading: 'smooth',
  },
} as const satisfies KnotData
