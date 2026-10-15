import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'muse_wonder',
  title: 'Muse Wonder',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
