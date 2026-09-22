import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'mimo',
  title: 'MiMo',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
