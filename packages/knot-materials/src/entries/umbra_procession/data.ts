import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'umbra_procession',
  candidateId: 'gpt_sol',
  title: 'Umbra Procession',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'A procession of black suns crosses royal velvet, each corona sewn from threads that remember the light.',
  placeholder: {
    color: '#430d24',
    shading: 'fabric',
  },
} as const satisfies KnotData
