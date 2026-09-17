import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'singularity_crown',
  candidateId: 'glm',
  title: 'Event Horizon',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Light bends around a dark sovereign that never needs to show its face.',
  placeholder: {
    color: '#ffb257',
    shading: 'ghost',
  },
} as const satisfies KnotData
