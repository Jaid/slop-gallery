import type {KnotData} from '../../types.ts'

export default {
  id: 'chromatic_reef',
  candidateId: 'deepseek',
  title: 'Chromatic Reef',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  flavorText: 'A reef of restless color grows beyond the charted spectrum.',
  placeholder: {
    color: '#ff6ec7',
    shading: 'smooth',
  },
} as const satisfies KnotData
