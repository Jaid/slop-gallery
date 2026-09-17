import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mercury_tide',
  candidateId: 'claude_sonnet',
  title: 'Mercury Tide',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'Silver rises and falls against a shoreline made entirely of reflections.',
  placeholder: {
    color: '#d7dbe3',
    shading: 'liquid',
  },
} as const satisfies KnotData
