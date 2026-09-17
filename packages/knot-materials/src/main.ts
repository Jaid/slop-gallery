import * as candidates from './candidates/index.ts'
import * as entries from './entries/index.ts'
import KnotCandidate, {indexKnots} from './KnotCandidate.ts'

// Metadata only. Importing the catalogue never evaluates material constructors.
const candidateOrder = [candidates.gpt_astra, candidates.claude_sonnet, candidates.claude_opus, candidates.deepseek, candidates.gemini_flash, candidates.glm, candidates.glm_flash, candidates.grok, candidates.kimi, candidates.qwen_max, candidates.gpt_sol, candidates.claude_fable, candidates.muse_spark, candidates.hy]
export const knotCandidates = candidateOrder.map(data => new KnotCandidate(data, Object.values(entries).filter(entry => entry.candidateId === data.id)))
export const knotsById = indexKnots(knotCandidates)
export const knots = [...knotsById.values()]

export * as entries from './entries/index.ts'
export {default as KnotCandidate} from './KnotCandidate.ts'
export {common, ethereal, prime, rare, default as rarities} from './rarities.ts'
export default knots

export type {Rarity} from './rarities.ts'
export type {KnotAuthor, KnotCandidateData, KnotCandidateId, KnotData, KnotEntry, KnotId, KnotMaterialConstructor, KnotPlaceholder, PlaceholderShading} from './types.ts'
