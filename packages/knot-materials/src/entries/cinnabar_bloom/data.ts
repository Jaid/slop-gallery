import type {KnotData} from '../../types.ts'

// Mage run: HU72JSGdKyp7pBO; fixture: knot-material-shaders; result: success.
export default {
  id: 'cinnabar_bloom',
  candidateId: 'gpt_sol',
  title: 'Cinnabar Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  displacement: 0.011,
  flavorText: 'A garden carved from a thousand coats of red lacquer. Each gilded petal holds its breath until you pass.',
  placeholder: {
    color: '#b82312',
    shading: 'smooth',
  },
} as const satisfies KnotData
