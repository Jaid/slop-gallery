import type {CanvasTextureRecipe} from '../three/types.ts'
import type {Texture} from 'three/webgpu'

import {useEffect, useState} from 'react'

import prepareCanvasTexture from '../three/prepareCanvasTexture.ts'

export type ReactCanvasTextureRecipe<T> = CanvasTextureRecipe<T> & {onError?: (error: unknown) => void}

/** Memoize the recipe. Each identity owns one final raster and its cleanup, even under StrictMode. */
export default function useCanvasTexture<T>(recipe: ReactCanvasTextureRecipe<T>) {
  const [result, setResult] = useState<{recipe: ReactCanvasTextureRecipe<T>
    texture: Texture<ImageBitmap>} | null>(null)
  useEffect(() => {
    const controller = new AbortController
    let owned: Texture<ImageBitmap> | null = null
    const render = async () => {
      try {
        const texture = await prepareCanvasTexture(recipe, controller.signal)
        // Cleanup can run between the producer resolving and this continuation executing.
        if (controller.signal.aborted) {
          texture?.dispose()
          return
        }
        if (texture) {
          owned = texture
          setResult({
            recipe,
            texture,
          })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (recipe.onError) {
            recipe.onError(error)
          } else {
            console.error('Canvas texture rendering failed.', error)
          }
        }
      }
    }
    // Effects cannot await; also contain exceptions thrown by a supplied error handler.
    // eslint-disable-next-line promise/prefer-await-to-then
    void render().catch(console.error)
    return () => {
      controller.abort()
      owned?.dispose()
    }
  }, [recipe])
  // Never expose an old, possibly disposed texture for a new recipe.
  return result?.recipe === recipe ? result.texture : null
}
