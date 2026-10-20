import {MeshBasicNodeMaterial} from 'three/webgpu'

import {daylightSky} from './daylightSky.ts'

/**
 * The clear panes of the Lobby vault.
 *
 * The procedural sky is shaded straight onto the glass, so the panes stay in the opaque pass with the plaster and the bars. A
 * transparent pane would composite over whatever is behind it, and there is nothing behind the vault but the clear color. The
 * glass still picks up a little of the room’s light at the frame, where the bars and ribs cover the edges.
 */
export default class VaultGlassMaterial extends MeshBasicNodeMaterial {
  constructor() {
    super()
    this.name = 'vault-glass'
    this.fog = false
    this.toneMapped = false
    this.colorNode = daylightSky()
  }
}
