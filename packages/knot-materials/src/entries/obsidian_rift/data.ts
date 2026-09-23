import type {KnotData} from '../../types.ts'

export default {
  id: 'obsidian_rift',
  candidateId: 'glm',
  title: 'Obsidian Rift',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'A narrow opening in black glass reveals that the fire never truly left.',
  placeholder: {
    color: '#ff5a1f',
    shading: 'stone',
  },
} as const satisfies KnotData
