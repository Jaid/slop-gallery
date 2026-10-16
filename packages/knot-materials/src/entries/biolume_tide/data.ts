import type {KnotData} from '../../types.ts'

export default {
  id: 'biolume_tide',
  candidateId: 'kimi',
  title: 'Biolume Tide',
  createdAt: 1_789_075_137,
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
