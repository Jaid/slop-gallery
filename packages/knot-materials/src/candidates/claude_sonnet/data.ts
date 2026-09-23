import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'claude_sonnet',
  title: 'Claude Sonnet',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
