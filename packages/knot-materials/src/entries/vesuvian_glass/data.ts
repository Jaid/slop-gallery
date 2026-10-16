import type {KnotData} from '../../types.ts'

export default {
  id: 'vesuvian_glass',
  candidateId: 'glm',
  title: 'Vesuvian Glass',
  createdAt: 1789075137,
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'A volcanic night has cooled into a vessel that still seems warm inside.',
  placeholder: {
    color: '#ff7a41',
    shading: 'glass',
  },
} as const satisfies KnotData
