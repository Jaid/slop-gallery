import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'singularity_halo',
  candidateId: 'claude_opus',
  title: 'Singularity Halo',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 4.6 Thinking',
      slug: 'anthropic/claude-opus-4-6-thinking',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A forgotten singularity bent into a knot; its photon ring is the last light that refused to fall.',
  placeholder: {
    color: '#1b1230',
    shading: 'smooth',
  },
} as const satisfies KnotData
