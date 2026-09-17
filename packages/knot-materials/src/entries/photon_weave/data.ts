import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'photon_weave',
  candidateId: 'glm_flash',
  title: 'Photon Weave',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3 Flash',
      slug: 'z-ai/glm-5.3-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'Light threads itself through a fabric with no ordinary fibers.',
  placeholder: {
    color: '#ffce54',
    shading: 'fabric',
  },
} as const satisfies KnotData
