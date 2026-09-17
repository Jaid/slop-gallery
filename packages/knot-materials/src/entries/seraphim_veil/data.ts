import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'seraphim_veil',
  candidateId: 'gpt_sol',
  title: 'Seraphim Veil',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  flavorText: 'Pale radiance folds into something almost feathered at the edge of sight.',
  placeholder: {
    color: '#ffe6bd',
    shading: 'glass',
  },
} as const satisfies KnotData
