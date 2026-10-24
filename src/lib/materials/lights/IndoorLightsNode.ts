import type {Light} from 'three/webgpu'

import FilteredLightsNode from './base/FilteredLightsNode.ts'

/** Whether a light reaches enclosed rooms. The gallery’s sun is not shadowed that far out, so it would shine through every ceiling. */
export const reachesIndoors = (light: Light) => !(light as Light & {isDirectionalLight?: boolean}).isDirectionalLight

/** Every scene light except directional ones: fires, lamps and the gallery’s ambient and hemisphere fill. */
export default class IndoorLightsNode extends FilteredLightsNode {
  admits(light: Light) {
    return reachesIndoors(light)
  }
}
