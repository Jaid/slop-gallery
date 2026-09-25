import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'space_bunny',
  title: 'Space Bunny',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
