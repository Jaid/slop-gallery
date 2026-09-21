import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'prism_orchard',
  candidateId: 'gpt_astra',
  title: 'Prism Orchard',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'Jewels ripen in an impossible orchard, trading emerald mornings for violet evenings as you pass.',
  placeholder: {
    color: '#2a8b78',
    shading: 'glass',
  },
} as const satisfies KnotData
