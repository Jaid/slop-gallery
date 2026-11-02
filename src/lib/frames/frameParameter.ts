import optis from 'optis'
import readPermalink from 'read-permalink'

/** the ids of every frame there is, in kebab-case, the default first; `index.ts` holds a frame for each */
export const frameIds = ['classic', 'lobby-louis', 'vesper-ripple', 'banquet-perspective', 'antechamber-adam', 'sienna-velvet', 'salon-barbizon', 'cinnabar-meander', 'moonfall-meteorite', 'fortress-oak'] as const
/** the id of one of the frames */
export type PortraitFrameId = typeof frameIds[number]

const frameSchema = optis({
  defaults: {
    frame: '',
  },
  normalizations: {
    frame(value: unknown): PortraitFrameId | '' {
      return frameIds.find(id => id === value) ?? ''
    },
  },
})

/** Read the `?frame`, the id of a frame every work wears instead of its own, for comparing frames in any room; empty for none or an id no frame has. */
export function readFrame(input: URL | string = typeof location === 'undefined' ? '' : location.href): PortraitFrameId | '' {
  return readPermalink(input, {schema: frameSchema}).frame
}
