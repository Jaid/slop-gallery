import type {KnotData} from '../../types.ts'

// Mage run: IBraVE33noBp60D.
export default {
  id: 'hoarfrost_canticle',
  candidateId: 'gpt_sol',
  title: 'Hoarfrost Canticle',
  createdAt: 1790311863,
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The cold writes sixfold hymns in glass; each crystal opens another verse as you draw near.',
  placeholder: {
    color: '#b7dce1',
    shading: 'glass',
  },
} as const satisfies KnotData
