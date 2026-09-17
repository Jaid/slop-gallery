import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'lichtenberg_stormglass',
  candidateId: 'grok',
  title: 'Lichtenberg Stormglass',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Glass holds the branching roots of a thunderstorm that never touched the ground.',
  placeholder: {
    color: '#cfe8ff',
    shading: 'glass',
  },
} as const satisfies KnotData
