import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'phase_ghost',
  candidateId: 'claude_fable',
  title: 'Phase Ghost',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'The surface keeps arriving a fraction of a moment after its reflection.',
  placeholder: {
    color: '#8cf5ff',
    shading: 'ghost',
  },
} as const satisfies KnotData
