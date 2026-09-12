import * as astra from './astra/index.ts'
import * as deepseek from './deepseek/index.ts'
import * as fable from './fable/index.ts'
import * as gemini from './gemini/index.ts'
import * as glm from './glm/index.ts'
import * as grok from './grok/index.ts'
import * as hunyuan from './hunyuan/index.ts'
import * as kimi from './kimi/index.ts'
import KnotCandidate, {indexKnots} from './KnotCandidate.ts'
import * as muse from './muse/index.ts'
import * as qwen from './qwen/index.ts'
import * as sol from './sol/index.ts'
import * as sonnet from './sonnet/index.ts'

const candidates = [astra, sonnet, deepseek, gemini, glm, grok, kimi, qwen, sol, fable, muse, hunyuan]
export const knotCandidates = candidates.map(({data, ...items}) => new KnotCandidate(data, Object.values(items)))
export const knotsByNumber = indexKnots(knotCandidates)
export const knots = [...knotsByNumber.values()].sort((a, b) => a.number - b.number)

export {default as KnotCandidate} from './KnotCandidate.ts'
export type {KnotAuthor, KnotCandidateData, KnotData, KnotEntry, KnotMaterialConstructor} from './types.ts'
