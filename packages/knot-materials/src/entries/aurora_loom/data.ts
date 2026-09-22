import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_loom',
  candidateId: 'grok',
  title: 'Aurora Loom',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Night is the warp. Everything colored is only a thread that refused to stay in the dark.',
  placeholder: {
    color: '#154c58',
    shading: 'fabric',
  },
} as const satisfies KnotData
