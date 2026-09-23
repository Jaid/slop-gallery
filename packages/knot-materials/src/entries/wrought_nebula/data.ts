import type {KnotData} from '../../types.ts'

export default {
  id: 'wrought_nebula',
  candidateId: 'grok',
  title: 'Wrought Nebula',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A smith has hammered a drifting cloud of stars into a luminous curve.',
  placeholder: {
    color: '#e56bff',
    shading: 'smooth',
  },
} as const satisfies KnotData
