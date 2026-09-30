import type {KnotData} from '../../types.ts'

// Mage run: 2tmj6W7XIniDLsB; fixture: knot-material-shaders; result: success.
export default {
  id: 'glacial_vigil',
  candidateId: 'gpt_sol',
  title: 'Glacial Vigil',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Winter keeps a cathedral inside a single crystal. Feathered frost floats between blue planes; the light moves, but the ancient cold remains.',
  placeholder: {
    color: '#82bbc5',
    shading: 'glass',
  },
} as const satisfies KnotData
