import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ventricle_glass',
  candidateId: 'grok',
  title: 'Ventricle Glass',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A transparent chamber turns a quiet pulse into a visible tide.',
  placeholder: {
    color: '#ff4a6a',
    shading: 'glass',
  },
} as const satisfies KnotData
