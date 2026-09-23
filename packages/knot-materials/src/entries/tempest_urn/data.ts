import type {KnotData} from '../../types.ts'

export default {
  id: 'tempest_urn',
  candidateId: 'glm_flash',
  title: 'Tempest Urn',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'A storm has been given a vessel, but not an ending.',
  placeholder: {
    color: '#c9d4e8',
    shading: 'smooth',
  },
} as const satisfies KnotData
