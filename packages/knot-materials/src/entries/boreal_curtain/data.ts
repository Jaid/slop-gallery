import type {KnotData} from '../../types.ts'

export default {
  id: 'boreal_curtain',
  candidateId: 'glm',
  title: 'Aurora Veil',
  createdAt: 1_789_075_137,
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'A green hush drifts across the opening between earth and sky.',
  placeholder: {
    color: '#68ffc0',
    shading: 'smooth',
  },
} as const satisfies KnotData
