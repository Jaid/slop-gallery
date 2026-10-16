import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {rooms} from '#src/lib/gallery.ts'
import lobbyCeiling, {lobbyCoffers, lobbyLamps} from '#src/lib/gallery/lobbyCeiling.ts'
import LobbyCeilingGeometry from '#src/lib/gallery/LobbyCeilingGeometry.ts'
import CofferPlasterMaterial from '#src/lib/materials/CofferPlasterMaterial.ts'
import LaylightGlassMaterial from '#src/lib/materials/LaylightGlassMaterial.ts'
import {LanternLight} from '#src/lib/materials/lights/index.ts'

const room = rooms.find(candidate => candidate.id === 'lobby')!
const laylightFields = lobbyCoffers().filter(coffer => coffer.laylight).map(({field}) => ({
  center: [room.center[0] + field.center[0], room.center[1] + field.center[1]] as const,
  size: field.size,
}))
const firstLaylight = laylightFields[0]
/** World x/z of a pane corner; every laylight field starts on the same pane grid. */
const paneOrigin = [
  firstLaylight.center[0] - firstLaylight.size[0] / 2,
  firstLaylight.center[1] - firstLaylight.size[1] / 2,
] as const

/** The Lobby’s coffered ceiling with a band of laylights down its middle. Rendered inside the room’s group, at its center. */
export default function LobbyCeiling() {
  const geometry = useDisposable(useMemo(() => new LobbyCeilingGeometry, []))
  // A shade lighter than the slab, so the coffers still read in fast mode, where no shadows or occlusion draw them.
  const plaster = useDisposable(useMemo(() => new CofferPlasterMaterial({
    color: '#ece7d9',
    fields: laylightFields,
    glassY: lobbyCeiling.underside - lobbyCeiling.glassOffset,
  }), []))
  // Painted bronze glazing bars: dark enough to draw the pane grid, matte enough not to streak under the lamps.
  const bars = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#6e5a40',
    metalness: 0.4,
    roughness: 0.55,
  }), []))
  const glass = useDisposable(useMemo(() => new LaylightGlassMaterial(lobbyCeiling.pane, paneOrigin, {
    brightness: 0.9,
    fieldFalloff: 0.16,
    // Warm ivory like the room’s lamps, rather than the Salon’s cooler north light.
    haze: '#eae4d6',
    tint: '#fbf3e3',
  }), []))
  const lamps = useDisposable(useMemo(() => new LobbyLamps, []))
  // The lamps stand in for the daylight through the glass; coffers shadowing the ceiling from below would look backward.
  return <group name='lobby-ceiling'>
    <mesh castShadow={false} geometry={geometry.plaster} material={plaster} name='lobby-ceiling-coffers' receiveShadow />
    <mesh castShadow={false} geometry={geometry.bars} material={bars} name='lobby-ceiling-glazing-bars' />
    <mesh castShadow={false} geometry={geometry.glass} material={glass} name='lobby-ceiling-laylights' />
    {lamps.lights.map(lamp => <primitive key={lamp.uuid} object={lamp} />)}
  </group>
}

/** The Lobby’s lamps, roofed so they light the room and its walls but not the coffers right above them. */
class LobbyLamps {
  readonly lights = lobbyLamps.offsets.map(z => {
    const shadows = z === lobbyLamps.shadowCaster
    const lamp = new LanternLight({
      color: lobbyLamps.color,
      intensity: lobbyLamps.intensity,
      distance: shadows ? lobbyLamps.shadowDistance : lobbyLamps.distance,
      decay: 2,
      roof: lobbyLamps.roof,
    })
    lamp.name = `lobby-lamp-${z}`
    lamp.position.set(0, lobbyLamps.y, z)
    lamp.castShadow = shadows
    lamp.shadow.mapSize.set(1024, 1024)
    lamp.shadow.normalBias = 0.03
    return lamp
  })

  dispose() {
    for (const lamp of this.lights) {
      lamp.dispose()
    }
  }
}
