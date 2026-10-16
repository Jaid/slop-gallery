import type {KnotData} from '../../types.ts'

export default {
  id: 'magnetic_ink',
  candidateId: 'glm',
  title: 'Magnetic Ink',
  createdAt: 1789075137,
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'Black strokes rearrange themselves around a message no hand has written.',
  placeholder: {
    color: '#8f7bff',
    shading: 'metal',
  },
} as const satisfies KnotData
