import {StandardDrawingPipeline} from 'three/webgpu'

/** how a drawing pipeline projects one object of a scene into a render list, recursing into its children through `project` */
export type Projection = (...input: Parameters<StandardDrawingPipeline['project']>) => void

/**
 * Projects scenes through a projection that can change from one render to the next, three’s own by default.
 *
 * three’s projection walks into children through `project`, so a projection sees every object of the scene and can leave some out, draw them regardless of the frustum or hand them on to {@link standard}.
 */
export default class GalleryDrawingPipeline extends StandardDrawingPipeline {
  /** three’s own projection of an object and, through {@link project}, its children */
  readonly standard: Projection = (...input) => {
    super.project(...input)
  }

  /** the projection {@link project} applies, {@link standard} unless replaced */
  projection: Projection = this.standard

  override project(...input: Parameters<StandardDrawingPipeline['project']>) {
    this.projection(...input)
  }
}
