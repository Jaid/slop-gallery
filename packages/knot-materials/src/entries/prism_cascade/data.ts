import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'prism_cascade',
  candidateId: 'deepseek',
  title: 'Prism Cascade',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  flavorText: 'Daylight falls through a series of colors it did not know it contained.',
  placeholder: {
    color: '#ffb0e0',
    shading: 'glass',
  },
} as const satisfies KnotData
