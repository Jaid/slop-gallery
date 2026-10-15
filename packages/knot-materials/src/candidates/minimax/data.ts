import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'minimax',
  title: 'MiniMax M3',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
