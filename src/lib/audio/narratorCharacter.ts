import {environmentPick, environmentRoll, environmentSample} from '../environmentSeed.ts'

/**
 * ordered from quiet and controlled to playful and energetic, so neighboring traits in an instruction belong together
 * Synonyms share an entry, of which an instruction names at most one.
 */
export const narratorTraits: ReadonlyArray<ReadonlyArray<string> | string> = [
  // composure
  ['calm', 'composed'],
  // authority
  ['knowledgeable', 'erudite'],
  ['articulate', 'eloquent'],
  // understated humor
  ['dry', 'deadpan'],
  'wry',
  ['witty', 'humorous'],
  // sharp humor
  ['sarcastic', 'sardonic'],
  'self-deprecating',
  // playful humor
  ['cheeky', 'mischievous'],
  'conspiratorial',
  // energy
  'lively',
]
/** Gemini TTS voices the narrator speaks with */
export const narratorVoices = ['Alnilam', 'Iapetus', 'Rasalgethi', 'Sadaltager', 'Umbriel', 'Zubenelgenubi']
const narratorNouns = ['narration', 'narrator', 'commentary', 'art gallery director']
const narratorSuffixes = ['', 'pleasant to listen to', 'easy to listen to', 'hooking the listeners', 'easily hooking the listener']

/** the narrator’s delivery instructions for the speech model in the environment of `seed`: 2 to 5 of its traits in their listed order, one noun and an optional suffix */
export function narratorCharacter(seed: number) {
  const count = 2 + Math.floor(environmentRoll(seed, 'narrator-character:count') * 4)
  const entries = environmentSample(seed, 'narrator-character:traits', narratorTraits, count)
  const traits = entries.map(entry => (typeof entry === 'string' ? entry : environmentPick(seed, `narrator-character:synonym:${entry[0]}`, entry)))
  const noun = environmentPick(seed, 'narrator-character:noun', narratorNouns)
  const suffix = environmentPick(seed, 'narrator-character:suffix', narratorSuffixes)
  return [...traits, noun, suffix].filter(Boolean).join(' ')
}

/** the narrator’s voice in the environment of `seed` */
export function narratorVoice(seed: number) {
  return environmentPick(seed, 'narrator-voice', narratorVoices)
}
