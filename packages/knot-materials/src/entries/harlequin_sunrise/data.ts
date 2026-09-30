import type {KnotData} from '../../types.ts'

// Mage run: CyxjCrlY15yEfmL; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'harlequin_sunrise',
  candidateId: 'claude_sonnet',
  title: 'Harlequin Sunrise',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'Every patch of this black opal keeps a different sunrise, and gives it away only to the one who moves.',
  placeholder: {
    color: '#141b2e',
    shading: 'glass',
  },
} as const satisfies KnotData
