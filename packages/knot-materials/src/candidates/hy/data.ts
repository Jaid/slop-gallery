import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'hy',
  title: 'Hy',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
