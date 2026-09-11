import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'astra',
  title: 'GPT-6 Astra',
  icon: new URL('icon.jxl', import.meta.url).href,
  overview: new URL('overview.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
