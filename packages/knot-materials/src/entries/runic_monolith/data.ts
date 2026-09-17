import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'runic_monolith',
  candidateId: 'kimi',
  title: 'Runic Monolith',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Old marks glow on a stone whose language seems older than its maker.',
  placeholder: {
    color: '#43ffd0',
    shading: 'smooth',
  },
} as const satisfies KnotData
