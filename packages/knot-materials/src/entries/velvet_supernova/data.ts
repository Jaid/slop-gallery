import type {KnotData} from '../../types.ts'

export default {
  id: 'velvet_supernova',
  candidateId: 'gpt_astra',
  title: 'Velvet Supernova',
  createdAt: 1_789_075_137,
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'An extravagant burst of color settles into the softness of a dark cloth.',
  placeholder: {
    color: '#fc9a91',
    shading: 'fabric',
  },
} as const satisfies KnotData
