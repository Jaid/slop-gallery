import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'molten_core',
  candidateId: 'claude_sonnet',
  title: 'Molten Core',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'A thin crust is all that separates the room from a small furnace.',
  placeholder: {
    color: '#ff6a3d',
    shading: 'liquid',
  },
} as const satisfies KnotData
