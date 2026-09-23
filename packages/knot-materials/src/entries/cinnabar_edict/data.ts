import type {KnotData} from '../../types.ts'

export default {
  id: 'cinnabar_edict',
  candidateId: 'grok',
  title: 'Cinnabar Edict',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A vermilion seal preserves an order whose kingdom has vanished.',
  placeholder: {
    color: '#e31c13',
    shading: 'smooth',
  },
} as const satisfies KnotData
