import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_heartbeat',
  number: 115,
  title: 'Obsidian Heartbeat',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3-contributor',
      effortLevel: 'xhigh',
    },
  },
  accent: '#ff3d00',
  highlighted: false,
} as const satisfies KnotData
