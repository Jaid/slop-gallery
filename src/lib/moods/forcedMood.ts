import optis from 'optis'
import readPermalink from 'read-permalink'

import {moods} from './index.ts'

const moodSchema = optis({
  defaults: {
    mood: '',
  },
  normalizations: {
    mood(value: unknown) {
      return moods.find(mood => mood.id === value)?.id ?? ''
    },
  },
})

/** Read the `?mood`, the id of a mood that holds all the time as if its prop were held, for looking at it without grabbing anything; empty for none. */
export function readMood(input: URL | string = typeof location === 'undefined' ? '' : location.href): string {
  return readPermalink(input, {schema: moodSchema}).mood
}

/** the mood `?mood` holds for the page’s whole session, read once at startup */
export const forcedMood = moods.find(mood => mood.id === readMood()) ?? null
