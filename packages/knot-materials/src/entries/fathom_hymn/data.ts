import type {KnotData} from '../../types.ts'

export default {
  id: 'fathom_hymn',
  candidateId: 'glm',
  title: 'Fathom Hymn',
  createdAt: 1_791_852_458,
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'A chorus too deep to hear leaves its harmonies in living light.',
  placeholder: {
    color: '#38d6ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
