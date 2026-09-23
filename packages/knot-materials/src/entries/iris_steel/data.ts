import type {KnotData} from '../../types.ts'

export default {
  id: 'iris_steel',
  candidateId: 'grok',
  title: 'Iris Steel',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'The metal opens a colored eye each time the light moves.',
  placeholder: {
    color: '#9ab8ff',
    shading: 'metal',
  },
} as const satisfies KnotData
