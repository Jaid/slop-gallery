import type {KnotData} from '../../types.ts'

// Mage run: 42qNahiwSEZ3v90; fixture: knot-material-shaders; result: success.
export default {
  id: 'petalwake',
  candidateId: 'gpt_sol',
  title: 'Petalwake',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A thousand shells remember being flowers. Their porcelain blush turns to sea-green fire when you pass.',
  placeholder: {
    color: '#f7dbcf',
    shading: 'smooth',
  },
} as const satisfies KnotData
