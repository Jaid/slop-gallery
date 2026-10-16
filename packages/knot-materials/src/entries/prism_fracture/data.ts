import type {KnotData} from '../../types.ts'

export default {
  id: 'prism_fracture',
  candidateId: 'qwen_max',
  title: 'Chronoclast',
  createdAt: 1789075137,
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'A broken ray returns as a mosaic of neighboring colors.',
  placeholder: {
    color: '#ffffff',
    shading: 'glass',
  },
} as const satisfies KnotData
