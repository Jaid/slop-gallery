import type {KnotData} from '../../types.ts'

// Mage run: 42qNahiwSEZ3v90; fixture: knot-material-shaders; result: success.
export default {
  id: 'prismatic_trellis',
  candidateId: 'gpt_sol',
  title: 'Prismatic Trellis',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Jewels ripen on an impossible trellis. Each facet holds a different afternoon, and releases it as you turn.',
  placeholder: {
    color: '#0e766f',
    shading: 'glass',
  },
} as const satisfies KnotData
