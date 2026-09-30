import type {KnotData} from '../../types.ts'

// Mage run: CyxjCrlY15yEfmL; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'bismuth_stairwell',
  candidateId: 'claude_sonnet',
  title: 'Bismuth Stairwell',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'Crystals grew inward, stair by stair, and every step remembers the color of the air it met.',
  placeholder: {
    color: '#5d5865',
    shading: 'metal',
  },
} as const satisfies KnotData
