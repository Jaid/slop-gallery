import type {KnotData} from '../../types.ts'

export default {
  id: 'cinnabar_palimpsest',
  candidateId: 'grok',
  title: 'Cinnabar Palimpsest',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Older messages rise through the red surface of a forgotten inscription.',
  placeholder: {
    color: '#e23b2a',
    shading: 'smooth',
  },
} as const satisfies KnotData
