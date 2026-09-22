import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cinnabar_kiln',
  candidateId: 'grok',
  title: 'Cinnabar Kiln',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The kiln never quite goes out. Heat keeps rewriting the glaze in a slower alphabet than fire.',
  placeholder: {
    color: '#971f22',
    shading: 'smooth',
  },
} as const satisfies KnotData
