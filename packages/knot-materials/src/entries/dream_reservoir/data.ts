import type {KnotData} from '../../types.ts'

// Mage run: 42qNahiwSEZ3v90; fixture: knot-material-shaders; result: success.
export default {
  id: 'dream_reservoir',
  candidateId: 'gpt_sol',
  title: 'Dream Reservoir',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Little lakes keep the evening safe beneath their lenses. One step brings sunset; another, the moon and its silver wake.',
  placeholder: {
    color: '#226579',
    shading: 'glass',
  },
} as const satisfies KnotData
