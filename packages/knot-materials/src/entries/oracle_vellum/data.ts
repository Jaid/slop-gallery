import type {KnotData} from '../../types.ts'

// Mage run: HU72JSGdKyp7pBO; fixture: knot-material-shaders; result: success.
export default {
  id: 'oracle_vellum',
  candidateId: 'gpt_sol',
  title: 'Oracle Vellum',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'A manuscript without a language. Its ink remembers your shadow; its gold remembers a future you have not yet lived.',
  placeholder: {
    color: '#eedeb9',
    shading: 'fabric',
  },
} as const satisfies KnotData
