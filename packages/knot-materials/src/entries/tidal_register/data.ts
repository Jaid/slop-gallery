import type {KnotData} from '../../types.ts'

export default {
  id: 'tidal_register',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  title: 'Tidal Register',
  flavorText: 'Small enamel shutters turn in patient succession, recording a tide that never reaches the shore.',
  icon: new URL('icon.jxl', import.meta.url).href,
  placeholder: {
    color: '#72baad',
    shading: 'metal',
  },
} as const satisfies KnotData
