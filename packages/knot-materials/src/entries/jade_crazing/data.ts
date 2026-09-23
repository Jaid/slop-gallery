import type {KnotData} from '../../types.ts'

export default {
  id: 'jade_crazing',
  candidateId: 'kimi',
  title: 'Celadon Crackle',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Hairline paths cross a green glaze like rivers seen from far above.',
  placeholder: {
    color: '#b7e3cd',
    shading: 'stone',
  },
} as const satisfies KnotData
