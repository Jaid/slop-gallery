import type {KnotData} from '../../types.ts'

export default {
  id: 'iris_membrane',
  candidateId: 'claude_opus',
  title: 'Iris Membrane',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A thin skin of color seems to narrow around your gaze.',
  placeholder: {
    color: '#b06cff',
    shading: 'glass',
  },
} as const satisfies KnotData
