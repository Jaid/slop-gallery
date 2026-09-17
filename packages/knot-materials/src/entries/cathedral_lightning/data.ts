import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cathedral_lightning',
  candidateId: 'muse_spark',
  title: 'Cathedral Lightning',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  flavorText: 'Thunder has left its illuminated handwriting in a crystal nave.',
  placeholder: {
    color: '#7af0ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
