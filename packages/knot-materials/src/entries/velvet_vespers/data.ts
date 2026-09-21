import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'velvet_vespers',
  candidateId: 'gpt_astra',
  title: 'Velvet Vespers',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'A twilight vestment woven for no earthly ceremony. Rose-gold damask rises from wine-dark velvet as the light turns.',
  placeholder: {
    color: '#4a1730',
    shading: 'fabric',
  },
} as const satisfies KnotData
