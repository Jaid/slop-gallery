import type {CanvasTextureRecipe} from './types.ts'
import type {Texture} from 'three/webgpu'

import renderCanvasBitmapTexture from './renderCanvasBitmapTexture.ts'

/** Cancelled inputs skip drawing; cancelled snapshots are disposed. The caller owns a returned texture. */
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
  let texture: Texture<ImageBitmap> | null = null
  try {
    if (cancelled()) {
      return null
    }
    texture = await renderCanvasBitmapTexture({
      ...recipe,
      draw: context => recipe.draw(context, inputs),
    })
    if (cancelled()) {
      texture.dispose()
      return null
    }
    return texture
  } catch (error) {
    if (cancelled()) {
      return null
    }
    throw error
  } finally {
    try {
      recipe.disposeInputs?.(inputs)
    } catch (error) {
      texture?.dispose()
      throw error
    }
  }
}
