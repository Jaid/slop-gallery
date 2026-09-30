import type {KnotData} from '../../types.ts'

// Mage run: 1o1ree11eGriGjv; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'parallax_deep_field',
  candidateId: 'claude_sonnet',
  title: 'Parallax Deep Field',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'A window opened in the dark: with every step you take, whole galaxies slide past each other at different speeds.',
  placeholder: {
    color: '#3b1c9c',
    shading: 'glass',
  },
} as const satisfies KnotData
