import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'kimi',
  title: 'Kimi K3',
  icon: new URL('icon.jxl', import.meta.url).href,
  overview: new URL('overview.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
