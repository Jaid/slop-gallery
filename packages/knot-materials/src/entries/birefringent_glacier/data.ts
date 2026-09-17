import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'birefringent_glacier',
  candidateId: 'grok',
  title: 'Birefringent Glacier',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A frozen passage splits the daylight into neighboring worlds.',
  placeholder: {
    color: '#9ad8ff',
    shading: 'glass',
  },
} as const satisfies KnotData
