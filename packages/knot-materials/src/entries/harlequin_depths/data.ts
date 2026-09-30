import type {KnotData} from '../../types.ts'

// Mage run: 1o1ree11eGriGjv; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'harlequin_depths',
  candidateId: 'claude_sonnet',
  title: 'Harlequin Depths',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'Millions of silica spheres settle into ordered patches, and every patch answers a different angle with its own color.',
  placeholder: {
    color: '#0b1f57',
    shading: 'glass',
  },
} as const satisfies KnotData
