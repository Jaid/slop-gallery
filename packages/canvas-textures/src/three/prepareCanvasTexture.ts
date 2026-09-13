import type {CanvasTextureRecipe} from './types.ts'

import renderCanvasTexture from './renderCanvasTexture.ts'

/** Cancelled preparations allocate nothing. The caller owns and must dispose a returned texture. */
export default async function prepareCanvasTexture<T>(recipe: CanvasTextureRecipe<T>, signal: AbortSignal) {
  // Read afresh after await: cancellation can happen outside this function.
  const cancelled = () => signal.aborted
  if (cancelled()) {
    return null
  }
  let inputs: T
  try {
    inputs = await recipe.prepare(signal)
  } catch (error) {
    if (cancelled()) {
      return null
    }
    throw error
  }
  try {
    if (cancelled()) {
      return null
    }
    const texture = renderCanvasTexture({
      ...recipe,
      draw: context => recipe.draw(context, inputs),
    })
    if (cancelled()) {
      texture.dispose()
      return null
    }
    return texture
  } finally {
    recipe.disposeInputs?.(inputs)
  }
}
