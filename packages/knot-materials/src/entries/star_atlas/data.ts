import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'star_atlas',
  candidateId: 'kimi',
  title: 'Star Atlas',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  flavorText: 'A map of distant lights rearranges its bearings as the viewer moves.',
  placeholder: {
    color: '#ffe9a8',
    shading: 'smooth',
  },
} as const satisfies KnotData
