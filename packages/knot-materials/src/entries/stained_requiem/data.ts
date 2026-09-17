import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
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
  archived: true,
} as const satisfies KnotData
