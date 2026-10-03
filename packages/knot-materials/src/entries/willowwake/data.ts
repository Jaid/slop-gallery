import type {KnotData} from '../../types.ts'

// Mage run: FLhq233R9MU4dj1; fixture: knot-material-shaders; result: success.
export default {
  id: 'willowwake',
  candidateId: 'gpt_sol',
  title: 'Willowwake',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Blue gardens sleep in bone-white porcelain. Come close: the painted leaves remember spring, and hairline gold mends the winter.',
  placeholder: {
    color: '#f0e7cf',
    shading: 'smooth',
  },
} as const satisfies KnotData
