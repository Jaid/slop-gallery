import type {KnotData} from '../../types.ts'

export default {
  id: 'mercury_script',
  candidateId: 'grok',
  title: 'Mercury Script',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The writing is already finished. It only agrees to be read from the angle you have not tried.',
  placeholder: {
    color: '#59616e',
    shading: 'metal',
  },
} as const satisfies KnotData
