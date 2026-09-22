import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mosslight_garden',
  candidateId: 'gpt_sol',
  title: 'Mosslight Garden',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'An old forest dreams in miniature; dew catches the stars while blue-green roots trade quiet signals below.',
  displacement: 0.024,
  placeholder: {
    color: '#365c32',
    shading: 'stone',
  },
} as const satisfies KnotData
