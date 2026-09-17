import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'meissner_core',
  candidateId: 'kimi',
  title: 'Meissner Core',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  flavorText: 'The cold heart holds the field at a distance, making absence tangible.',
  placeholder: {
    color: '#9fd8ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
