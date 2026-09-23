import type {KnotData} from '../../types.ts'

export default {
  id: 'kintsugi_storm',
  candidateId: 'grok',
  title: 'Kintsugi Storm',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Lightning finds every old fracture and stitches it briefly with gold.',
  placeholder: {
    color: '#ffd56a',
    shading: 'stone',
  },
} as const satisfies KnotData
