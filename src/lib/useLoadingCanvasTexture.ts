import type {ReactCanvasTextureRecipe} from 'canvas-textures/react'

import useCanvasTexture from 'canvas-textures/react'
import {useEffect, useMemo, useState} from 'react'

import {startLoading} from './loadingItems.ts'

/** Lists the item as loading while `loading` holds. */
export function useLoadingItem(id: string, loading: boolean) {
  useEffect(() => (loading ? startLoading(id) : undefined), [id, loading])
}

/** {@link useCanvasTexture}, listing the texture as the loading item `id` until it is drawn or has failed. */
export default function useLoadingCanvasTexture<T>(id: string, recipe: ReactCanvasTextureRecipe<T>) {
  const [failed, setFailed] = useState<ReactCanvasTextureRecipe<T> | null>(null)
  const tracked = useMemo(() => ({
    ...recipe,
    onError: (error: unknown) => {
      setFailed(recipe)
      if (recipe.onError) {
        recipe.onError(error)
      } else {
        console.error('Canvas texture rendering failed.', error)
      }
    },
  }), [recipe])
  const texture = useCanvasTexture(tracked)
  useLoadingItem(id, !texture && failed !== recipe)
  return texture
}
