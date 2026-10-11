import type {CanvasRaster, CanvasSize} from '../types.ts'

export type CanvasTextureOptions = {
  anisotropy?: number
  /** false for non-color data such as bump maps. */
  color?: boolean
  /** Preserve mipmaps for artwork and repeating surfaces; opt out explicitly for signage. */
  mipmaps?: boolean
  name?: string
}
export type CanvasTextureRaster = CanvasRaster & CanvasTextureOptions
export type CanvasTextureRecipe<T> = CanvasSize & CanvasTextureOptions & Pick<CanvasRaster, 'resolution'> & {
  /** Release decoded images or other preparation resources after drawing or cancellation. */
  disposeInputs?: (inputs: T) => void
  draw: (context: CanvasRenderingContext2D, inputs: T) => void
  /** Resolve inputs before allocating or drawing a canvas. Honor the signal for cancellable work. */
  prepare: (signal: AbortSignal) => Promise<T>
}
