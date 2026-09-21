import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'amber_orchard',
  candidateId: 'gpt_astra',
  title: 'Amber Orchard',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'An orchard sleeps in a drop of ancient sunlight. Move gently: every suspended frond remembers a different depth of time.',
  placeholder: {
    color: '#b57421',
    shading: 'glass',
  },
} as const satisfies KnotData
