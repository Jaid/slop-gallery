import type {KnotData} from '../../types.ts'

export default {
  id: 'obsidian_bioluminescence',
  candidateId: 'qwen_max',
  title: 'Obsidian Leviathan',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'Living light has found a home in the cracks of volcanic glass.',
  placeholder: {
    color: '#00e5ff',
    shading: 'liquid',
  },
} as const satisfies KnotData
