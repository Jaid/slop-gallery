import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'kimi',
  title: 'Kimi',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
