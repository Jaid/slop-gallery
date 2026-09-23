import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'glm_flash',
  title: 'GLM Flash',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
