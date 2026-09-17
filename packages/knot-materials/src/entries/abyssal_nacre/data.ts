import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_nacre',
  candidateId: 'grok',
  title: 'Abyssal Nacre',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Pearl gathers in layers where even moonlight cannot settle.',
  placeholder: {
    color: '#7de8d0',
    shading: 'glass',
  },
} as const satisfies KnotData
