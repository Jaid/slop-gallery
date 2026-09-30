import type {KnotData} from '../../types.ts'

// Mage run: CyxjCrlY15yEfmL; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'cinder_psalm',
  candidateId: 'claude_sonnet',
  title: 'Cinder Psalm',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  displacement: 0.006,
  flavorText: 'The mountain cooled into a black hymn, but its cracks still remember every verse of fire.',
  placeholder: {
    color: '#1a1512',
    shading: 'stone',
  },
} as const satisfies KnotData
