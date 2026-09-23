import type {KnotData} from '../../types.ts'

export default {
  id: 'opal_fire',
  candidateId: 'claude_sonnet',
  title: 'Opal Fire',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'A small, restless flame changes color without consuming the stone around it.',
  placeholder: {
    color: '#ffb6e6',
    shading: 'glass',
  },
} as const satisfies KnotData
