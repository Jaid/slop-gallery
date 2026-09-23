import type {KnotData} from '../../types.ts'

export default {
  id: 'abyssal_drift',
  candidateId: 'kimi',
  title: 'Abyssal Drift',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'A slow procession of cold lanterns follows a tide no shore can feel.',
  placeholder: {
    color: '#46a0ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
