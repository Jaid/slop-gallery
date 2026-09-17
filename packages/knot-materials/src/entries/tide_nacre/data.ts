import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'tide_nacre',
  candidateId: 'grok',
  title: 'Tide Nacre',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Pearl keeps the slow rhythm of a tide long after the water has withdrawn.',
  placeholder: {
    color: '#7ef0d6',
    shading: 'glass',
  },
  archived: true,
} as const satisfies KnotData
