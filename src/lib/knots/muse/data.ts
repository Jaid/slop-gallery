import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'muse',
  title: 'Muse Spark',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
