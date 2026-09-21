import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'lichtenberg_glacier',
  candidateId: 'minimax',
  title: 'Lichtenberg Glacier',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiniMax M3',
      slug: 'minimax/minimax-m3',
    },
  },
  flavorText: 'A millionth of a second of lightning, kept forever in cold glass.',
  placeholder: {
    color: '#183c5e',
    shading: 'glass',
  },
} as const satisfies KnotData
