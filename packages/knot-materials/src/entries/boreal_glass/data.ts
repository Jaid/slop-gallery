import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'boreal_glass',
  candidateId: 'grok',
  title: 'Boreal Glass',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.005,
  flavorText: 'Night pressed into ice. Curtains of charged color stand inside it, and they brighten only when the eye travels along their length.',
  placeholder: {
    color: '#102838',
    shading: 'glass',
  },
} as const satisfies KnotData
