import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'muse_spark',
  title: 'Muse Spark',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
