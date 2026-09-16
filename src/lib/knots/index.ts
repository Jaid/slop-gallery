import * as gptAstra from './gpt_astra/index.ts'
import * as deepseek from './deepseek/index.ts'
import * as claudeFable from './claude_fable/index.ts'
import * as geminiFlash from './gemini_flash/index.ts'
import * as glm from './glm/index.ts'
import * as glmFlash from './glm_flash/index.ts'
import * as grok from './grok/index.ts'
import * as hy from './hy/index.ts'
import * as kimi from './kimi/index.ts'
import KnotCandidate, {indexKnots} from './KnotCandidate.ts'
import * as museSpark from './muse_spark/index.ts'
import * as claudeOpus from './claude_opus/index.ts'
import * as qwenMax from './qwen_max/index.ts'
import * as gptSol from './gpt_sol/index.ts'
import * as claudeSonnet from './claude_sonnet/index.ts'

const candidates = [gptAstra, claudeSonnet, claudeOpus, deepseek, geminiFlash, glm, glmFlash, grok, kimi, qwenMax, gptSol, claudeFable, museSpark, hy]
export const knotCandidates = candidates.map(({data, ...items}) => new KnotCandidate(data, Object.values(items)))
export const knotsById = indexKnots(knotCandidates)
export const knots = [...knotsById.values()]

export {default as KnotCandidate} from './KnotCandidate.ts'
export type {KnotAuthor, KnotCandidateData, KnotData, KnotEntry, KnotMaterialConstructor} from './types.ts'
