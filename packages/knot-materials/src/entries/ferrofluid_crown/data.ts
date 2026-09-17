import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrofluid_crown',
  candidateId: 'kimi',
  title: 'Ferrofluid Crown',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Liquid points gather into a coronation that never quite becomes solid.',
  placeholder: {
    color: '#6f7dff',
    shading: 'liquid',
  },
  archived: true,
} as const satisfies KnotData
