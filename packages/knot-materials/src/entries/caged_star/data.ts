import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'caged_star',
  candidateId: 'glm',
  title: 'Caged Star',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Its vessel is small; the fire inside has never noticed.',
  placeholder: {
    color: '#ffb347',
    shading: 'smooth',
  },
} as const satisfies KnotData
