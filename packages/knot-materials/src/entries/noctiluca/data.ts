import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'noctiluca',
  candidateId: 'grok',
  title: 'Noctiluca',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Tiny lights wake whenever the dark water begins to move.',
  placeholder: {
    color: '#5dffb0',
    shading: 'smooth',
  },
} as const satisfies KnotData
