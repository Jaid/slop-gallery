import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_heartbeat',
  candidateId: 'muse_spark',
  title: 'Obsidian Heartbeat',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Warm light returns to the same dark fissures with every patient pulse.',
  placeholder: {
    color: '#ff3d00',
    shading: 'stone',
  },
} as const satisfies KnotData
