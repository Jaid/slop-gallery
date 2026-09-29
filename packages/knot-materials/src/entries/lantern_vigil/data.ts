import type {KnotData} from '../../types.ts'

// Mage run: KKRUCJSg0WdighD; fixture: knot-material-shaders.
export default {
  id: 'lantern_vigil',
  candidateId: 'claude_fable',
  title: 'Lantern Vigil',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'high',
    },
  },
  flavorText: 'Mulberry paper over bamboo, and a single flame walking the long way round inside. Pressed petals show as shadows when the light passes behind them, then fade as it moves on.',
  placeholder: {
    color: '#f3e9d6',
    shading: 'fabric',
  },
} as const satisfies KnotData
