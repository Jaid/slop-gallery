import type {KnotData} from '../../types.ts'

// Mage run: DZoyAbZAQlwnlPj; fixture: knot-material-shaders; result: success.
export default {
  id: 'cloud_chamber',
  candidateId: 'claude_opus',
  title: 'Cloud Chamber',
  createdAt: 1792085143,
  harness: 'Mage',
  author: {model: {
    title: 'Claude Opus 5.5',
    slug: 'anthropic/claude-opus-5.5',
    effortLevel: 'high',
  }},
  flavorText: 'Every second, the universe passes through you unseen. Here, in a cold supersaturated mist, its passage finally leaves a trace.',
  placeholder: {
    color: '#404144',
    shading: 'glass',
  },
} as const satisfies KnotData
