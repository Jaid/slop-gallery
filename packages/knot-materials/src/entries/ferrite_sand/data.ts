import type {KnotData} from '../../types.ts'

export default {
  id: 'ferrite_sand',
  candidateId: 'hy',
  title: 'Ferrite Sand',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Dark grains lean together as though listening for a distant magnet.',
  placeholder: {
    color: '#29d9ff',
    shading: 'metal',
  },
} as const satisfies KnotData
