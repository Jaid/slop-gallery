import type {KnotData} from '../../types.ts'

export default {
  id: 'risograph_register',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  title: 'Risograph Register',
  flavorText: 'Three imperfect impressions agree on a color none of their inks could make alone.',
  placeholder: {
    color: '#dfbd83',
    shading: 'fabric',
  },
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotData
