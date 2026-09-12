import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'storm_vessel',
  number: 145,
  title: 'Storm Vessel',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  accent: '#8a7bff',
  highlighted: false,
} as const satisfies KnotData
