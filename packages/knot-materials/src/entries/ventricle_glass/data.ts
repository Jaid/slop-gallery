import type {KnotData} from '../../types.ts'

export default {
  id: 'ventricle_glass',
  candidateId: 'grok',
  title: 'Ventricle Glass',
  createdAt: 1789231507,
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A transparent chamber turns a quiet pulse into a visible tide.',
  placeholder: {
    color: '#ff4a6a',
    shading: 'glass',
  },
} as const satisfies KnotData
