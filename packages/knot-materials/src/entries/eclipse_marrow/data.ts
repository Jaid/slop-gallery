import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'eclipse_marrow',
  candidateId: 'grok',
  title: 'Eclipse Marrow',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'The dark heart of an eclipse keeps a thin reserve of sunlight.',
  placeholder: {
    color: '#ff8a5c',
    shading: 'smooth',
  },
  archived: true,
} as const satisfies KnotData
