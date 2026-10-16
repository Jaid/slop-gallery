import optis from 'optis'
import readPermalink, {parseBoolean} from 'read-permalink'

export const intro = {
  id: '__intro',
  title: 'Welcome to Slop Gallery',
  description: 'Where the art is questionable and the insurance is imaginary. Take a walk, touch the paintings and bring a little of your own chaos. The curator has already left.',
}

const introNarrationSchema = optis({
  defaults: {
    intro_narration: true,
  },
  normalizations: {
    intro_narration(value: unknown) {
      try {
        return parseBoolean(value)
      } catch {
        return true
      }
    },
  },
})

/** Read the `?intro_narration` flag; only an explicit `false` or `0` skips the welcome narration. */
export function readIntroNarration(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: introNarrationSchema}).intro_narration
}
