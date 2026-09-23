import type {KnotData} from '../../types.ts'

export default {
  id: 'nebula_glass',
  candidateId: 'qwen_max',
  title: 'Stellar Nursery',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'A cloud of distant stars drifts through a vessel of clear night.',
  placeholder: {
    color: '#ff00aa',
    shading: 'glass',
  },
} as const satisfies KnotData
