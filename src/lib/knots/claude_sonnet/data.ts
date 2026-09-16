import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'claude_sonnet',
  title: 'Claude Sonnet',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
