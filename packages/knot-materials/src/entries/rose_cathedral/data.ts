import type {KnotData} from '../../types.ts'

// Mage run: FLhq233R9MU4dj1; fixture: knot-material-shaders; result: success.
export default {
  id: 'rose_cathedral',
  candidateId: 'gpt_sol',
  title: 'Rose Cathedral',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Ruby, jade and amber hold a silent choir. The windows turn inward, and their impossible sun follows you through the nave.',
  placeholder: {
    color: '#c52648',
    shading: 'glass',
  },
} as const satisfies KnotData
