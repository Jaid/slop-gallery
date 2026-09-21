import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'bismuth_bloom',
  candidateId: 'minimax',
  title: 'Bismuth Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiniMax M3',
      slug: 'minimax/minimax-m3',
    },
  },
  flavorText: 'Molten bismuth forgets itself in stepped terraces of oxide colour, each landing a different temperature of rainbow.',
  displacement: 0.009,
  placeholder: {
    color: '#b36fb8',
    shading: 'metal',
  },
} as const satisfies KnotData
