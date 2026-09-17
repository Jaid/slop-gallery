import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_satin',
  candidateId: 'claude_sonnet',
  title: 'Aurora Veil',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'Cold light moves across a cloth too fine for human hands.',
  placeholder: {
    color: '#8ff5d4',
    shading: 'fabric',
  },
  archived: true,
} as const satisfies KnotData
