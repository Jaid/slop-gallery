import type {KnotData} from '../../types.ts'

export default {
  id: 'cinder_meridian',
  candidateId: 'grok',
  title: 'Cinder Meridian',
  createdAt: 1_789_231_507,
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A hot seam marks the longitude of a world turning dark.',
  placeholder: {
    color: '#ff6a1a',
    shading: 'stone',
  },
} as const satisfies KnotData
