import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cinnabar_oracle',
  candidateId: 'grok',
  title: 'Cinnabar Oracle',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Answers gather in red lacquer, but only while you look away.',
  placeholder: {
    color: '#ff4d3a',
    shading: 'smooth',
  },
  archived: true,
} as const satisfies KnotData
