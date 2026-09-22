import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'soap_cathedral',
  candidateId: 'grok',
  title: 'Soap Cathedral',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A cathedral blown from one breath, thin enough that daylight has to choose a color to leave.',
  placeholder: {
    color: '#96c6ce',
    shading: 'glass',
  },
} as const satisfies KnotData
