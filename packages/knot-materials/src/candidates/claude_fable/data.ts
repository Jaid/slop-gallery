import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'claude_fable',
  title: 'Claude Fable',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
