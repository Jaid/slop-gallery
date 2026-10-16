import type {KnotData} from '../../types.ts'

export default {
  id: 'velvet_umbra',
  candidateId: 'grok',
  title: 'Velvet Umbra',
  createdAt: 1789231507,
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A soft black surface keeps the light at its very edges.',
  placeholder: {
    color: '#c4a06a',
    shading: 'fabric',
  },
} as const satisfies KnotData
