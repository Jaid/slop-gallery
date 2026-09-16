import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'hy',
  title: 'Hy',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
