import type {KnotData} from '../../types.ts'

// Mage run: KKRUCJSg0WdighD; fixture: knot-material-shaders.
export default {
  id: 'kintsugi_moon',
  candidateId: 'claude_fable',
  title: 'Kintsugi Moon',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'high',
    },
  },
  flavorText: 'It broke. It was mended with gold, because the break was part of its life now and worth remembering. Under the glaze, cobalt clouds still drift the way the painter left them.',
  placeholder: {
    color: '#f4f0e8',
    shading: 'smooth',
  },
} as const satisfies KnotData
