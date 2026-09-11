import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'superfluid_vortex',
  number: 32,
  title: 'Superfluid Vortex',
  author: {
    model: {
      title: 'Gemini 3.6 Flash',
    },
  },
  accent: '#00ffbf',
  highlighted: true,
} as const satisfies KnotData
