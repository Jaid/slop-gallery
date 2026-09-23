import type {KnotData} from '../../types.ts'

export default {
  id: 'aureate_loom',
  candidateId: 'gpt_astra',
  title: 'Aureate Loom',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Someone taught gold to remember silk. Every thread keeps a different sunrise, and none will show it to you twice.',
  placeholder: {
    color: '#643c47',
    shading: 'fabric',
  },
} as const satisfies KnotData
