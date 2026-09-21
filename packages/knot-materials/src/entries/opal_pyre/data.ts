import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'opal_pyre',
  candidateId: 'minimax',
  title: 'Opal Pyre',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiniMax M3',
      slug: 'minimax/minimax-m3',
    },
  },
  flavorText: 'A fire frozen in silica. The colours come from somewhere inside, and never the same colour twice.',
  placeholder: {
    color: '#d15f3d',
    shading: 'glass',
  },
} as const satisfies KnotData
