import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'caustic_chapel',
  candidateId: 'grok',
  title: 'Caustic Chapel',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.006,
  flavorText: 'A drowned floor of pale tile, where shallow water writes and erases its scripture. Nearer, the letters sharpen. Aside, the surface keeps them.',
  placeholder: {
    color: '#5e9e98',
    shading: 'glass',
  },
} as const satisfies KnotData
