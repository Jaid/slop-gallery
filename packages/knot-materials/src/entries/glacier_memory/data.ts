import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'glacier_memory',
  candidateId: 'grok',
  title: 'Glacier Memory',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Old seasons stay stacked in the ice, each one a little bluer than the light that made it.',
  displacement: 0.003,
  placeholder: {
    color: '#7cc2df',
    shading: 'glass',
  },
} as const satisfies KnotData
