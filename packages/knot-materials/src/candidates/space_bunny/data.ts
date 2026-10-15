import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'space_bunny',
  title: 'Space Bunny',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
