import type {Vec3} from '#src/lib/gallery.ts'
import type {Orb as OrbKind} from '#src/lib/gallery/orbs/index.ts'

import useDisposable from 'disposable-lifetime/react'
import {useEffect, useMemo, useRef, useState} from 'react'
import {MeshStandardNodeMaterial, Vector3} from 'three/webgpu'

import InteractiveObject from '#component/InteractiveObject'
import Orb from '#component/Orb'
import SwitchPlate, {SwitchButton} from '#component/SwitchPlate'
import {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {switchSoundEffects} from '#src/lib/audio/switchSoundEffects.ts'
import {playEffect} from '#src/lib/gallery.ts'
import {wallFace} from '#src/lib/gallery/architectureDimensions.ts'
import {forgeDrop} from '#src/lib/gallery/forgeGutter.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import {releasedOrb, releaseLocked} from '#src/lib/gallery/orbRelease.ts'
import walls, {releaseSpot} from '#src/rooms/forge/walls.ts'
import slopGallery from '#src/worlds/gallery/index.ts'

/** how far from right over the hole an orb may start, either way, so no two drops roll quite alike */
const scatter = 0.015
/** how long the button stays pushed in after releasing an orb, in seconds */
const pushed = 0.3
const wall = walls.west
const worldPosition = new Vector3
/** Every prop by its id and where it is shown: lying, rolling, carried or held by a portal. */
function *propPositions(): Generator<readonly [string, Vec3]> {
  for (const [id, prop] of propObjects) {
    yield [id, prop.group.getWorldPosition(worldPosition).toArray()]
  }
}
const roomAt = (position: Vec3) => slopGallery.roomAt(position)?.id
/** Whether an orb is still on its way, or anywhere else in the Forge or the Bastion. */
const orbAround = () => releaseLocked(propPositions(), roomAt)

/**
 * The button on the Forge’s west wall that releases an orb through the hole in the ceiling over it into the gutter, which rolls round the room’s corner, through the wall into the vestibule’s gutter and on down the Bastion into its crater.
 * Every time, it is a new orb picked at random, steered by what lies in the Forge or is carried into it, see {@link releasedOrb}.
 * It does nothing while any orb is still in the Forge or the Bastion, so orbs never queue up on the way.
 */
export default function OrbRelease() {
  const [released, setReleased] = useState<ReadonlyArray<{
    id: string
    orb: OrbKind
    position: Vec3
  }>>([])
  const [pressed, setPressed] = useState(false)
  /** until when a release just asked for counts as an orb on its way, before its prop has registered */
  const busyUntil = useRef(0)
  const enamel = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#8e2a1c',
    roughness: 0.25,
  }), []))
  useEffect(() => {
    if (!pressed) {
      return
    }
    const timer = setTimeout(() => setPressed(false), pushed * 1000)
    return () => clearTimeout(timer)
  }, [pressed])
  const press = () => {
    if (performance.now() < busyUntil.current || orbAround()) {
      playEffect(switchSoundEffects.releaseLocked.id)
      return
    }
    busyUntil.current = performance.now() + 1000
    playEffect(switchSoundEffects.release.id)
    setPressed(true)
    const [x, y, z] = forgeDrop.spawn
    const orb = releasedOrb(propPositions(), roomAt, Math.random())
    setReleased(orbs => [...orbs, {
      id: `${orb.propId}-released-${orbs.length + 1}`,
      orb,
      position: [x + (Math.random() * 2 - 1) * scatter, y, z + (Math.random() * 2 - 1) * scatter],
    }])
  }
  const [originX, originY, originZ] = roomOrigins.forge
  return <>
    <group position={[originX + wall.center[0], originY + wall.center[1], originZ + wall.center[2]]} rotation={[0, wall.rotation, 0]}>
      <InteractiveObject id={slopGallery.room('forge').room.globalId('orb_release')} action='Release an orb' name='forge-orb-release' position={[releaseSpot.u, releaseSpot.y, wallFace]} title='Orb release' onActivate={press}>
        <SwitchPlate buttons={1} />
        <SwitchButton material={enamel} pressed={pressed} y={0} />
      </InteractiveObject>
    </group>
    {released.map(({id, orb, position}) => <Orb key={id} id={id} orb={orb} position={position} />)}
  </>
}
