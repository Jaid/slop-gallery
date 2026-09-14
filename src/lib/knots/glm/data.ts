import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'glm',
  title: 'GLM',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
