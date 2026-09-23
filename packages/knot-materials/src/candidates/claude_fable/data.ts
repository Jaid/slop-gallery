import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'claude_fable',
  title: 'Claude Fable',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
