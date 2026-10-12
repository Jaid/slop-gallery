import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'claude_haiku',
  title: 'Claude Haiku',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
