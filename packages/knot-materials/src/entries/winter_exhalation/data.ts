import type {KnotData} from '../../types.ts'

// Mage run: FLhq233R9MU4dj1; fixture: knot-material-shaders; result: success.
export default {
  id: 'winter_exhalation',
  candidateId: 'gpt_sol',
  title: 'Winter Exhalation',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'An ocean exhales its last winter into crystal. Silver dendrites drift at different depths, each a small cathedral of cold.',
  placeholder: {
    color: '#7dbdc8',
    shading: 'glass',
  },
} as const satisfies KnotData
