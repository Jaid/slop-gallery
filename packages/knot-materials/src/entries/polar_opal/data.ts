import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'polar_opal',
  candidateId: 'grok',
  title: 'Polar Opal',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Winter light moves inside the stone as though the horizon were trapped there.',
  placeholder: {
    color: '#ff7ad9',
    shading: 'glass',
  },
} as const satisfies KnotData
