import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'fable',
  title: 'Claude Fable',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
