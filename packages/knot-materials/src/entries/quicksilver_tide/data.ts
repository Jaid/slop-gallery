import type {KnotData} from '../../types.ts'

// Mage run: 1o1ree11eGriGjv; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'quicksilver_tide',
  candidateId: 'claude_sonnet',
  title: 'Quicksilver Tide',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  displacement: 0.03,
  flavorText: 'Liquid metal remembers every raindrop that never fell, and rings the whole gallery back at you.',
  placeholder: {
    color: '#d5dae3',
    shading: 'liquid',
  },
} as const satisfies KnotData
