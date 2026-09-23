import type {KnotData} from '../../types.ts'

export default {
  id: 'paper_cathedral',
  candidateId: 'gpt_astra',
  title: 'Paper Cathedral',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'Seven pierced pages hold a sanctuary between them. Ivory petals descend toward a rose-colored light that never becomes a flame.',
  displacement: 0.013,
  placeholder: {
    color: '#d7c7aa',
    shading: 'smooth',
  },
} as const satisfies KnotData
