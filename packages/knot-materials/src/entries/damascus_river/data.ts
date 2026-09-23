import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'damascus_river',
  candidateId: 'grok',
  title: 'Damascus River',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.007,
  flavorText: 'Folded a thousand times, the steel remembers every river that quenched it. Turn the blade, and the water wakes along the grain.',
  placeholder: {
    color: '#8eadd4',
    shading: 'metal',
  },
} as const satisfies KnotData
