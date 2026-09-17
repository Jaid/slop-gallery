import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
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
  archived: true,
} as const satisfies KnotData
