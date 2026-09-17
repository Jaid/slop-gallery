import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cryolite_fracture',
  candidateId: 'claude_opus',
  title: 'Cryolite Fracture',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Blue silence splinters into planes of borrowed daylight.',
  placeholder: {
    color: '#7fc8ff',
    shading: 'glass',
  },
} as const satisfies KnotData
