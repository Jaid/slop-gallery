import type {KnotData} from '../../types.ts'

export default {
  id: 'magnetic_tide',
  candidateId: 'gpt_astra',
  title: 'Magnetic Tide',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A black sea kneels to an invisible moon. Its polished ridges rise, hesitate and dissolve into the next impossible tide.',
  displacement: 0.03,
  placeholder: {
    color: '#586571',
    shading: 'liquid',
  },
} as const satisfies KnotData
