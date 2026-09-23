import type {KnotData} from '../../types.ts'

export default {
  id: 'harlequin_opal',
  candidateId: 'kimi',
  title: 'Harlequin Opal',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'A hidden carnival changes its masks with every passing glance.',
  placeholder: {
    color: '#ffb3ec',
    shading: 'glass',
  },
} as const satisfies KnotData
