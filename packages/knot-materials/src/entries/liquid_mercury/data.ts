import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'liquid_mercury',
  candidateId: 'qwen_max',
  title: 'Ferrofluid Bloom',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'A restless mirror gathers every passing light into its quicksilver skin.',
  placeholder: {
    color: '#e0e0e0',
    shading: 'fabric',
  },
} as const satisfies KnotData
