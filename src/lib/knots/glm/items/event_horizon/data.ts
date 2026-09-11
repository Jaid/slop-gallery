import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'event_horizon',
  number: 98,
  title: 'Event Horizon',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  accent: '#ffb257',
  highlighted: false,
} as const satisfies KnotData
