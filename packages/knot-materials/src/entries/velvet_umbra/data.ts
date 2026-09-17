import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'velvet_umbra',
  candidateId: 'grok',
  title: 'Velvet Umbra',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A soft black surface keeps the light at its very edges.',
  placeholder: {
    color: '#c4a06a',
    shading: 'fabric',
  },
} as const satisfies KnotData
