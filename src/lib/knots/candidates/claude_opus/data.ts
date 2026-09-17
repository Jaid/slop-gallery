import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'claude_opus',
  title: 'Claude Opus',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
