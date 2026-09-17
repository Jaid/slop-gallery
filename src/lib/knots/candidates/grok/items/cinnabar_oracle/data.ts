import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cinnabar_oracle',
  title: 'Cinnabar Oracle',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#ff4d3a',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
