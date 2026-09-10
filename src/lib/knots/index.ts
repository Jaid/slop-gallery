import * as astra from './astra/index.ts'
import * as sonnet from './sonnet/index.ts'
import * as deepseek from './deepseek/index.ts'
import * as gemini from './gemini/index.ts'
import * as glm from './glm/index.ts'
import * as grok from './grok/index.ts'
import * as kimi from './kimi/index.ts'
import * as qwen from './qwen/index.ts'
import * as sol from './sol/index.ts'
import * as fable from './fable/index.ts'

import {indexKnots, KnotCandidate} from './KnotCandidate.ts'

const candidates = [astra, sonnet, deepseek, gemini, glm, grok, kimi, qwen, sol, fable]
export const knotCandidates = candidates.map(({data, ...items}) => new KnotCandidate(data, Object.values(items)))
export const knotsByNumber = indexKnots(knotCandidates)
export const knots = [...knotsByNumber.values()].sort((a, b) => a.number - b.number)

export type {KnotAuthor, KnotData, KnotEntry, KnotCandidateData, KnotMaterialConstructor} from './types.ts'
export {KnotCandidate, defaultKnotDisplayLimit} from './KnotCandidate.ts'
