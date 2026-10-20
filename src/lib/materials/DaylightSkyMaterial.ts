import {MeshBasicNodeMaterial} from 'three/webgpu'

import {daylightSky} from './daylightSky.ts'

/** The procedural sky as a surface, for the dome behind the Lobby’s vault glass. It carries no texture. */
export default class DaylightSkyMaterial extends MeshBasicNodeMaterial {
  constructor() {
    super()
    this.name = 'daylight-sky'
    this.fog = false
    this.toneMapped = false
    this.colorNode = daylightSky()
  }
}
