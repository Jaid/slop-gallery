import type {KnotData} from '../../types.ts'

export default {
  id: 'velvet_requiem',
  candidateId: 'grok',
  title: 'Velvet Requiem',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Pile this deep either drinks the light or gives it back, according to the way you face. Gold thread waits in the nap for a grazing eye.',
  placeholder: {
    color: '#c0102c',
    shading: 'fabric',
  },
} as const satisfies KnotData
