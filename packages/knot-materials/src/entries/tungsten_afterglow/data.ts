import type {KnotData} from '../../types.ts'

export default {
  id: 'tungsten_afterglow',
  candidateId: 'grok',
  title: 'Tungsten Afterglow',
  createdAt: 1_789_231_507,
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'The lamp is gone, but its fine metal heart has not finished glowing.',
  placeholder: {
    color: '#ff6a22',
    shading: 'metal',
  },
} as const satisfies KnotData
