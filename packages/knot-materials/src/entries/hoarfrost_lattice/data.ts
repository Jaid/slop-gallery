import type {KnotData} from '../../types.ts'

export default {
  id: 'hoarfrost_lattice',
  candidateId: 'grok',
  title: 'Hoarfrost Lattice',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Winter assembles a pale architecture too delicate for the dawn.',
  placeholder: {
    color: '#c5e7ff',
    shading: 'glass',
  },
} as const satisfies KnotData
