import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'grok',
  title: 'Grok 4.6',
  icon: new URL('icon.jxl', import.meta.url).href,
  overview: new URL('overview.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
