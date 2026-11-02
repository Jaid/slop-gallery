import type {BufferGeometry, Material} from 'three/webgpu'

import {MeshStandardNodeMaterial} from 'three/webgpu'

/** how far behind the middle of a work its frame’s back lies, the same for every frame, so each hangs the same distance off its wall */
export const frameBack = -0.095
/** the most triangles a frame of any size may take */
export const frameTriangleBudget = 2048
/** how far a frame may reach out past its work’s edge at most, its mat included, which the clearance between hung works leaves room for */
export const maximumFrameReach = 0.15

/**
 * A kind of frame works hang in: its moulding swept round the work, its ornaments and its materials, built for any size of work.
 *
 * A frame is laid out around the middle of its work, facing +z, its back at {@link frameBack}, and reaches {@link reach} out past the work’s edges. Its geometry holds one group per material, which are made once, when the first work wears the frame, and live as long as the page, like the shared gold.
 */
export default abstract class PortraitFrame {
  /** a sentence on what it looks like and what it is made of */
  abstract readonly description: string
  /** how far in front of the work’s middle the frame reaches at most */
  abstract readonly front: number
  /** how far in front of the work’s middle its image lies, recessed into the frame */
  abstract readonly imageDepth: number
  /** how far the frame reaches out past the work’s edges, its mat included */
  abstract readonly reach: number
  /** the color the frame shows as, which its ghost takes while the player carries the work */
  abstract readonly tint: string
  abstract readonly title: string
  #held: Material | undefined
  #materials: Array<Material> | undefined

  /** the frame’s depth from its back to its front */
  get depth() {
    return this.front - frameBack
  }

  /** a single translucent material for the whole frame while the player carries its work */
  get heldMaterial() {
    this.#held ??= new MeshStandardNodeMaterial({
      color: this.tint,
      metalness: 0.2,
      roughness: 0.5,
      transparent: true,
      opacity: 0.3,
    })
    return this.#held
  }

  /** the materials of the frame’s groups, by their indices */
  get materials() {
    this.#materials ??= this.createMaterials()
    return this.#materials
  }

  /** The frame round a work of `width` × `height` meters, one group per material. */
  abstract createGeometry(width: number, height: number): BufferGeometry

  protected abstract createMaterials(): Array<Material>
}
