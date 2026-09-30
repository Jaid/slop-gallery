import type {KnotData} from '../../types.ts'

// Mage run: 42qNahiwSEZ3v90; fixture: knot-material-shaders; result: success.
export default {
  id: 'strata_cantata',
  candidateId: 'gpt_sol',
  title: 'Strata Cantata',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Honey, chalk and ancient green sing in rings beneath the polish. A mountain’s heartbeat, slowed to the pace of stone.',
  placeholder: {
    color: '#dc8b38',
    shading: 'stone',
  },
} as const satisfies KnotData
