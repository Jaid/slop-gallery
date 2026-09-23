import type {KnotData} from '../../types.ts'

export default {
  id: 'velvet_penumbra',
  candidateId: 'claude_opus',
  title: 'Velvet Penumbra',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 4.6 Thinking',
      slug: 'anthropic/claude-opus-4-6-thinking',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A darkness so soft it seems touchable, turning every glancing light into a private eclipse.',
  displacement: 0.002,
  placeholder: {
    color: '#21132c',
    shading: 'fabric',
  },
} as const satisfies KnotData
