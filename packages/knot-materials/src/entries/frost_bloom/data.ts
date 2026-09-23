import type {KnotData} from '../../types.ts'

export default {
  id: 'frost_bloom',
  candidateId: 'glm',
  title: 'Frost Bloom',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Winter makes a brief garden on a surface it cannot keep.',
  placeholder: {
    color: '#cfeaff',
    shading: 'fabric',
  },
} as const satisfies KnotData
