import type {KnotData} from '../../types.ts'

// Mage run: 4ayQMqfdM3WbrB2; fixture: knot-material-shaders; result: success.
export default {
  id: 'emberhide',
  candidateId: 'claude_fable',
  title: 'Emberhide',
  harness: 'Mage',
  author: {model: {
    title: 'Claude Fable 5.1',
    slug: 'anthropic/claude-fable-5.1',
    effortLevel: 'high',
  }},
  flavorText: 'Something ancient is sleeping under these scales. Every breath pushes a little fire between them, and the rows ripple with color when you move.',
  placeholder: {
    color: '#606254',
    shading: 'smooth',
  },
} as const satisfies KnotData
