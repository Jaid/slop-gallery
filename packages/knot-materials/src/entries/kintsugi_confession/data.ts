import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_confession',
  candidateId: 'minimax',
  title: 'Kintsugi Confession',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiniMax M3',
      slug: 'minimax/minimax-m3',
    },
  },
  flavorText: 'A bowl the world refused, mended with a colour it cannot refuse.',
  placeholder: {
    color: '#89a89d',
    shading: 'smooth',
  },
} as const satisfies KnotData
