import type {KnotData} from '../../types.ts'

// Mage run: CbMOkykhfBD7NuC; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'kintsugi_vessel',
  candidateId: 'claude_haiku',
  title: 'Kintsugi Vessel',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Haiku 5.5',
      slug: 'anthropic/claude-haiku-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A celadon bowl broke, and was mended with gold lacquer. Every seam now burns brighter than the glaze that was lost.',
  placeholder: {
    color: '#a8b8a0',
    shading: 'glass',
  },
} as const satisfies KnotData
