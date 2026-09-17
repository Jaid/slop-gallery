import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'phoenix_ember',
  candidateId: 'kimi',
  title: 'Phoenix Ember',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  flavorText: 'A coal bright enough to suggest that the ending was only another beginning.',
  placeholder: {
    color: '#ffb35c',
    shading: 'smooth',
  },
} as const satisfies KnotData
