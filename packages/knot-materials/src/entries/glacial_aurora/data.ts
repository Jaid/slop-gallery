import type {KnotData} from '../../types.ts'

export default {
  id: 'glacial_aurora',
  candidateId: 'claude_fable',
  title: 'Glacial Aurora',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Northern light moves slowly through the memory of ancient ice.',
  placeholder: {
    color: '#2dff9a',
    shading: 'glass',
  },
} as const satisfies KnotData
