import type LanternLightsNode from './LanternLightsNode.ts'
import type {Light} from 'three/webgpu'

import FilteredLightsNode from './base/FilteredLightsNode.ts'
import {lightZone} from './LanternLightsNode.ts'

/** Whether a light reaches enclosed rooms. The gallery’s sun is not shadowed that far out, so it would shine through every ceiling. */
export const reachesIndoors = (light: Light) => !(light as Light & {isDirectionalLight?: boolean}).isDirectionalLight

/** Every scene light except directional ones and lamps that belong to a {@link LanternLightsNode} zone: fires, lamps and the gallery’s ambient and hemisphere fill. */
export default class IndoorLightsNode extends FilteredLightsNode {
  admits(light: Light) {
    // Lamps cast no shadows, so a zone’s lamps would otherwise shine through the walls onto its neighbors.
    return reachesIndoors(light) && lightZone(light) === undefined
  }
}
