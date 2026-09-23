import type {KnotData} from '../../types.ts'

export default {
  id: 'porcelain_reverie',
  candidateId: 'gpt_astra',
  title: 'Porcelain Reverie',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'Cobalt flowers dream beneath a moon-white glaze. Along their gilded stems, the last warmth of the kiln still wanders.',
  placeholder: {
    color: '#d9e3e5',
    shading: 'smooth',
  },
} as const satisfies KnotData
