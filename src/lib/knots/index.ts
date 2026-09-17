import * as claudeFable from './candidates/claude_fable/index.ts'
import * as claudeOpus from './candidates/claude_opus/index.ts'
import * as claudeSonnet from './candidates/claude_sonnet/index.ts'
import * as deepseek from './candidates/deepseek/index.ts'
import * as geminiFlash from './candidates/gemini_flash/index.ts'
import * as glm from './candidates/glm/index.ts'
import * as glmFlash from './candidates/glm_flash/index.ts'
import * as gptAstra from './candidates/gpt_astra/index.ts'
import * as gptSol from './candidates/gpt_sol/index.ts'
import * as grok from './candidates/grok/index.ts'
import * as hy from './candidates/hy/index.ts'
import * as kimi from './candidates/kimi/index.ts'
import * as museSpark from './candidates/muse_spark/index.ts'
import * as qwenMax from './candidates/qwen_max/index.ts'
import KnotCandidate, {indexKnots} from './KnotCandidate.ts'

const candidates = [gptAstra, claudeSonnet, claudeOpus, deepseek, geminiFlash, glm, glmFlash, grok, kimi, qwenMax, gptSol, claudeFable, museSpark, hy]
export const knotCandidates = candidates.map(({data, ...items}) => new KnotCandidate(data, Object.values(items)))
export const knotsById = indexKnots(knotCandidates)
export const knots = [...knotsById.values()]

export {default as KnotCandidate} from './KnotCandidate.ts'
export type {KnotAuthor, KnotCandidateData, KnotData, KnotEntry, KnotMaterialConstructor} from './types.ts'
