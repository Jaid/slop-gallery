import type {KnotData} from '../../types.ts'

export default {
  id: 'wraith_glass',
  candidateId: 'claude_sonnet',
  title: 'Wraith Glass',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'A pale presence moves through glass that seems reluctant to hold a reflection.',
  placeholder: {
    color: '#cfe9ff',
    shading: 'ghost',
  },
} as const satisfies KnotData
