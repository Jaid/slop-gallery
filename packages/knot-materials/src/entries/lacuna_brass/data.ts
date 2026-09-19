import type {KnotData} from '../../types.ts'

export default {
  id: 'lacuna_brass',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  title: 'Lacuna Brass',
  flavorText: 'A brass music roll keeps its missing notes, waiting for an instrument that can play a circle.',
  placeholder: {
    color: '#c79b50',
    shading: 'metal',
  },
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotData
