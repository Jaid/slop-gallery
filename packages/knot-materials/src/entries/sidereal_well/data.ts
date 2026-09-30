import type {KnotData} from '../../types.ts'

// Mage run: 2tmj6W7XIniDLsB; fixture: knot-material-shaders; result: success.
export default {
  id: 'sidereal_well',
  candidateId: 'gpt_sol',
  title: 'Sidereal Well',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A night with no horizon is sealed beneath black glass. Stars drift at different depths while a slow spiral gathers their light into an unspoken wish.',
  placeholder: {
    color: '#101426',
    shading: 'glass',
  },
} as const satisfies KnotData
