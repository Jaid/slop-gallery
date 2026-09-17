import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nocturne_opal',
  candidateId: 'muse_spark',
  title: 'Nocturne Opal',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  flavorText: "A low, colored melody moves through the stone's midnight chambers.",
  placeholder: {
    color: '#8a6cff',
    shading: 'glass',
  },
} as const satisfies KnotData
