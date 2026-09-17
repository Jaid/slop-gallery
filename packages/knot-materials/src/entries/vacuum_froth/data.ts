import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'vacuum_froth',
  candidateId: 'claude_sonnet',
  title: 'Quantum Foam',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'Small bright pockets trouble a space that ought to contain nothing at all.',
  placeholder: {
    color: '#9df3ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
