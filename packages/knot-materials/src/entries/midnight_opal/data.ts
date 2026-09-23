import type {KnotData} from '../../types.ts'

export default {
  id: 'midnight_opal',
  candidateId: 'glm_flash',
  title: 'Midnight Opal',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'A few late colors remain awake inside a stone made of midnight.',
  placeholder: {
    color: '#4dffc3',
    shading: 'glass',
  },
} as const satisfies KnotData
