import type {KnotData} from '../../types.ts'

export default {
  id: 'opal_vespers',
  candidateId: 'grok',
  title: 'Opal Vespers',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.008,
  flavorText: 'Dark potch keeps its fire banked until the eye arrives. Each buried grain then answers that angle with a spectrum it will not show twice.',
  placeholder: {
    color: '#3a3548',
    shading: 'glass',
  },
} as const satisfies KnotData
