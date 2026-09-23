import type {KnotData} from '../../types.ts'

export default {
  id: 'stained_requiem',
  candidateId: 'claude_sonnet',
  title: 'Stained Requiem',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'Colored glass holds the last notes of a song after the room has fallen quiet.',
  placeholder: {
    color: '#d24bd6',
    shading: 'smooth',
  },
} as const satisfies KnotData
