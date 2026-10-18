import type {KnotData} from '../../types.ts'

// Mage run: 7mkaA7JC9cNnoS2; fixture: knot-material-shaders; result: success.
export default {
  id: 'widmanstatten',
  candidateId: 'deepseek',
  title: 'Widmanstätten',
  createdAt: 1_792_264_877,
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'A world’s core fell through the sky and cooled for four billion years. Acid opens its silver geometry, still counting the days of the early solar system.',
  placeholder: {
    color: '#6a6d70',
    shading: 'metal',
  },
} as const satisfies KnotData
