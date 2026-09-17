import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aurora_cocoon',
  candidateId: 'glm_flash',
  title: 'Aurora Cocoon',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'A sleeping dawn waits inside its own luminous wrapping.',
  placeholder: {
    color: '#39ffb0',
    shading: 'smooth',
  },
} as const satisfies KnotData
