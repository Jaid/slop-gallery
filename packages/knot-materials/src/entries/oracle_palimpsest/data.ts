import type {KnotData} from '../../types.ts'

export default {
  id: 'oracle_palimpsest',
  candidateId: 'gpt_sol',
  title: 'Oracle Palimpsest',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Erased prophecies rise through warm vellum in indigo breath, beneath an alphabet illuminated with gold.',
  placeholder: {
    color: '#a67c4c',
    shading: 'fabric',
  },
} as const satisfies KnotData
