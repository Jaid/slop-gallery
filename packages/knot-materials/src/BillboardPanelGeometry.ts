import {BoxGeometry} from 'three/webgpu'

/** The overview supplies the front surface; timber only renders the edges and back. */
export default class BillboardPanelGeometry extends BoxGeometry {
  constructor(width: number, height: number, depth: number) {
    super(width, height, depth)
    const indices = this.index!
    const normals = this.getAttribute('normal')
    const visible: Array<number> = []
    for (let i = 0; i < indices.count; i += 3) {
      if (normals.getZ(indices.getX(i)) < 1) {
        visible.push(indices.getX(i), indices.getX(i + 1), indices.getX(i + 2))
      }
    }
    this.setIndex(visible)
    this.clearGroups()
  }
}
