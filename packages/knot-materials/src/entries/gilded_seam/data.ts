import type {KnotData} from '../../types.ts'

export default {
  id: 'gilded_seam',
  candidateId: 'grok',
  title: 'Gilded Seam',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.0045,
  flavorText: 'The bowl broke, and gold was asked to remember the shape. Step closer. The repair still keeps a little warmth from the kiln.',
  placeholder: {
    color: '#7f9c93',
    shading: 'stone',
  },
} as const satisfies KnotData
