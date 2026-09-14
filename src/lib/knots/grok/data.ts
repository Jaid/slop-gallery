import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'grok',
  title: 'Grok',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
