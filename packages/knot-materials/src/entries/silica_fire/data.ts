import type {KnotData} from '../../types.ts'

export default {
  id: 'silica_fire',
  candidateId: 'deepseek',
  title: 'Silica Fire',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A million silica spheres agree to disagree about the color of the light.',
  displacement: 0.0004,
  placeholder: {
    color: '#bbc7d1',
    shading: 'glass',
  },
} as const satisfies KnotData
