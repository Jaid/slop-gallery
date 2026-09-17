import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'biolume_tide',
  candidateId: 'kimi',
  title: 'Biolume Tide',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  flavorText: 'Living sparks rise and fall with the breathing of an unseen sea.',
  placeholder: {
    color: '#57ffe0',
    shading: 'liquid',
  },
} as const satisfies KnotData
