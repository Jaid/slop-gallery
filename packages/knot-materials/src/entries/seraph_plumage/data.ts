import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'seraph_plumage',
  candidateId: 'gpt_sol',
  title: 'Seraph Plumage',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'No bird wore these feathers; they molt from a sunrise and kindle as the witness circles them.',
  displacement: 0.007,
  placeholder: {
    color: '#c96738',
    shading: 'fabric',
  },
} as const satisfies KnotData
