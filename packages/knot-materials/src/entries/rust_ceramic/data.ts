import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'rust_ceramic',
  candidateId: 'claude_sonnet',
  title: 'Rust Ceramic',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A warm, iron-colored skin records the slow meeting of fire and clay.',
  placeholder: {
    color: '#b5651d',
    shading: 'stone',
  },
} as const satisfies KnotData
