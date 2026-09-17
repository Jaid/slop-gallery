import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'morpho_veil',
  candidateId: 'glm_flash',
  title: 'Morpho Veil',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  flavorText: "A butterfly's impossible blue passes across a nearly weightless surface.",
  placeholder: {
    color: '#3f7dff',
    shading: 'glass',
  },
} as const satisfies KnotData
