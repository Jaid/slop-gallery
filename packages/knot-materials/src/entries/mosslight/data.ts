import type {KnotData} from '../../types.ts'

// Mage run: 42qNahiwSEZ3v90; fixture: knot-material-shaders; result: success.
export default {
  id: 'mosslight',
  candidateId: 'gpt_sol',
  title: 'Mosslight',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.008,
  flavorText: 'The forest has folded its smallest dawn into this green relic. Come close; the sleeping spores will answer.',
  placeholder: {
    color: '#45713a',
    shading: 'fabric',
  },
} as const satisfies KnotData
