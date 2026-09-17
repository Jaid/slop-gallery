import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'gallium_thaw',
  candidateId: 'grok',
  title: 'Gallium Thaw',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Metal softens at the edge of a warmth it seems to recognize.',
  placeholder: {
    color: '#d7e0ea',
    shading: 'liquid',
  },
} as const satisfies KnotData
