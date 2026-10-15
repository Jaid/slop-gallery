import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'claude_opus',
  title: 'Claude Opus',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
