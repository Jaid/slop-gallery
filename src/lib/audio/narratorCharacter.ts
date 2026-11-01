import {environmentPick, environmentRoll, environmentSample} from '../environmentSeed.ts'

/** ordered from quiet and controlled to playful and energetic, so neighboring traits in an instruction belong together */
export const narratorTraits = [
  // composure
  'calm',
  'composed',
  // authority
  'knowledgeable',
  'erudite',
  'articulate',
  'eloquent',
  // understated humor
  'dry',
  'deadpan',
  'wry',
  'witty',
  // sharp humor
  'sarcastic',
  'sardonic',
  'self-deprecating',
  // playful humor
  'humorous',
  'cheeky',
  'mischievous',
  'conspiratorial',
  // energy
  'lively',
]
const narratorNouns = ['narration', 'narrator', 'commentary', 'art gallery director']
const narratorSuffixes = ['', 'pleasant to listen to', 'easy to listen to', 'hooking the listeners', 'easily hooking the listener']

/** the narrator’s delivery instructions for the speech model in the environment of `seed`: 2 to 5 of its traits in their listed order, one noun and an optional suffix */
export function narratorCharacter(seed: number) {
  const count = 2 + Math.floor(environmentRoll(seed, 'narrator-character:count') * 4)
  const traits = environmentSample(seed, 'narrator-character:traits', narratorTraits, count)
  const noun = environmentPick(seed, 'narrator-character:noun', narratorNouns)
  const suffix = environmentPick(seed, 'narrator-character:suffix', narratorSuffixes)
  return [...traits, noun, suffix].filter(Boolean).join(' ')
}
