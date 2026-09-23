import type {KnotData} from '../../types.ts'

export default {
  id: 'gossamer_dew',
  candidateId: 'grok',
  title: 'Gossamer Dew',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Small droplets make constellations along a nearly invisible thread.',
  placeholder: {
    color: '#d7ecff',
    shading: 'fabric',
  },
} as const satisfies KnotData
