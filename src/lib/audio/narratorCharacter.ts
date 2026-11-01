import {environmentPick, environmentRoll, environmentSample} from '../environmentSeed.ts'

export const narratorTraits = ['calm', 'knowledgeable', 'lively', 'witty', 'sarcastic', 'humorous', 'self-deprecating', 'wry', 'dry', 'deadpan', 'sardonic', 'cheeky', 'mischievous', 'conspiratorial', 'erudite', 'eloquent', 'articulate', 'composed']
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
