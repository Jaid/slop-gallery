import type {KnotData} from '../../types.ts'

export default {
  id: 'ion_cathedral',
  candidateId: 'glm_flash',
  title: 'Ion Cathedral',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'Charged light gathers beneath arches drawn by an unseen current.',
  placeholder: {
    color: '#9d6bff',
    shading: 'smooth',
  },
} as const satisfies KnotData
