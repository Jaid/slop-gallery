import type Fusion from '#src/lib/gallery/fusion/Fusion.ts'
import type {SatelliteOrbit, SatellitePose} from '#src/lib/gallery/fusion/orbit.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'
import type {RapierRigidBody} from '@react-three/rapier'
import type {Object3D} from 'three/webgpu'

import {clamp} from 'math'
import {Box3, Matrix4, Quaternion, Vector3} from 'three/webgpu'

import {useGallery} from '#src/lib/gallery.ts'
import {handBack} from '#src/lib/gallery/fusion/handBack.ts'
import {fizzleRelease, satellitePose} from '#src/lib/gallery/fusion/orbit.ts'
import {satelliteSize} from '#src/lib/gallery/fusion/portalFrame.ts'
import portraitObjects from '#src/lib/gallery/portraitObjects.ts'

import {propObjects} from '../Scene/GrabbableProp.tsx'

type Satellite = {
  body: RapierRigidBody
  /** the group inside its rigid body’s object, which the fusion moves */
  group: Object3D
  id: string
  kind: 'portrait' | 'prop' | 'work'
  orbit: SatelliteOrbit
  /** where it is this frame, in the world */
  pose: SatellitePose
  /** seconds into the fusion that it was handed back, after which it grows back to its size, from `releasedScale` */
  released?: number
  releasedScale: number
}

/** seconds a satellite takes to grow back to its size once it is handed back */
const regrowth = 0.4
/** the largest side an orbiting prop shrinks to, in meters */
const propSize = 0.6
/** seconds after the result that the portal spits a prop back out, once the result has risen clear of where the prop appears */
const spitDelay = 0.35
const holderInverse = new Matrix4
const matrix = new Matrix4
const scaleVector = new Vector3
const offset = new Vector3
const tangentVector = new Vector3
const box = new Box3
const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2
const poseOf = (object: Object3D) => {
  object.updateWorldMatrix(true, false)
  const position = new Vector3
  const quaternion = new Quaternion
  object.matrixWorld.decompose(position, quaternion, scaleVector)
  return {
    position,
    quaternion,
  }
}
/** a stable pseudo-random unit vector for the id, which a prop tumbles around */
const tumbleAxis = (id: string) => {
  let hash = 2_166_136_261
  for (const character of id) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16_777_619) >>> 0
  }
  const turn = hash / 4_294_967_296 * Math.PI * 2
  const axis = new Vector3(Math.cos(turn), 0.8, Math.sin(turn))
  return axis.normalize()
}

/**
 * The work and what was thrown into it while they orbit a fusion’s portal. The fusion moves each by the group inside its rigid body’s object, whose body is out of the physics meanwhile, and hands it back when it is done with it.
 * The work returns to its wall when the fusion fails or is aborted and flips out of the portal as the result otherwise; a loose work thrown into it is spat out on failure and consumed on success; a prop is always spat back out.
 */
export default class Satellites {
  /** where each satellite is in the world this frame, for the tethers; empty once it is handed back */
  readonly centers: Array<Vector3 | undefined> = []
  private readonly fusion: Fusion
  private list?: Array<Satellite>

  constructor(fusion: Fusion) {
    this.fusion = fusion
  }

  /** Hands back whatever is still held: the work snaps back to its wall, the rest drops where it is. */
  dispose() {
    for (const satellite of this.list ?? []) {
      if (satellite.released === undefined && satellite.kind !== 'work') {
        this.handBack(satellite, [0, 0, 0], [0, 0, 0])
      }
      if (satellite.kind === 'work' && satellite.released === undefined) {
        satellite.group.position.set(0, 0, 0)
        satellite.group.quaternion.identity()
      }
      satellite.group.scale.setScalar(1)
    }
    this.list = []
  }

  /** Moves every satellite to where it is `elapsed` seconds into the fusion and hands back those whose time has come. */
  update(elapsed: number) {
    const {fusion} = this
    const {frame, outcome, timing} = fusion
    this.list ??= this.seize()
    for (const [index, satellite] of this.list.entries()) {
      if (satellite.kind === 'portrait' && portraitObjects.get(satellite.id)?.group !== satellite.group) {
        // The result replaced it.
        satellite.released ??= elapsed
      }
      if (satellite.released !== undefined) {
        this.centers[index] = undefined
        satellite.group.scale.setScalar(satellite.releasedScale + (1 - satellite.releasedScale) * easeOutBack(clamp((elapsed - satellite.released) / regrowth, 0, 1)))
        continue
      }
      satellitePose(frame, timing, satellite.orbit, elapsed, outcome, satellite.pose)
      if (outcome?.kind === 'failure' && satellite.kind !== 'work' && elapsed >= outcome.at + fizzleRelease * timing.fizzle) {
        // Spat out of the dying portal to its side, and up a little.
        this.place(satellite)
        const [nx, , nz] = frame.normal
        const [tx, , tz] = frame.tangent
        const side = Math.sign(offset.subVectors(satellite.pose.position, offset.fromArray(frame.center)).dot(tangentVector.fromArray(frame.tangent))) || 1
        this.handBack(satellite, [tx * side * 1.7 + nx * 0.3, 1.7, tz * side * 1.7 + nz * 0.3], [3, 2, -2.5], elapsed)
        continue
      }
      if (fusion.emergedAt !== undefined) {
        if (satellite.kind === 'work' && this.launched(satellite)) {
          // The result flips out: the physics has its body at the portal now, so the group returns to it and grows to its size.
          satellite.group.position.set(0, 0, 0)
          satellite.group.quaternion.identity()
          satellite.released = elapsed
          satellite.releasedScale = 0
          satellite.group.scale.setScalar(0)
          continue
        }
        if (satellite.kind === 'prop' && elapsed >= fusion.emergedAt + spitDelay) {
          // Spat back out toward the room, a little to the side, below the result’s flight.
          const [nx, , nz] = frame.normal
          const [tx, , tz] = frame.tangent
          satellite.pose.position.fromArray(frame.center).add(offset.set(nx * 0.45, -0.25, nz * 0.45))
          satellite.pose.scale = 0.05
          this.place(satellite)
          this.handBack(satellite, [nx * 2.4 + tx * 0.9, 1.6, nz * 2.4 + tz * 0.9], [4, 3, 2], elapsed)
          continue
        }
      }
      this.place(satellite)
      this.centers[index] = satellite.pose.position
    }
  }

  private handBack(satellite: Satellite, velocity: Vec3, spin: Vec3, elapsed?: number) {
    satellite.released = elapsed ?? Number.NEGATIVE_INFINITY
    satellite.releasedScale = satellite.group.scale.x
    if (satellite.kind === 'prop') {
      propObjects.get(satellite.id)?.unleash(velocity, spin)
      return
    }
    // A loose work removed meanwhile, like one the result replaced, has nothing left to hand back.
    if (portraitObjects.get(satellite.id)?.group === satellite.group) {
      handBack(satellite.body, satellite.group, velocity, spin)
    }
  }

  /** Whether the result’s body has left the work’s spot on the wall for the portal. */
  private launched(satellite: Satellite) {
    const holder = satellite.group.parent
    if (!holder || !satellite.orbit.home) {
      return true
    }
    holder.updateWorldMatrix(true, false)
    return offset.setFromMatrixPosition(holder.matrixWorld).distanceTo(satellite.orbit.home.position) > 0.3
  }

  /** Moves the satellite’s group to its pose in the world, through its rigid body’s object. */
  private place({group, pose}: Satellite) {
    matrix.compose(pose.position, pose.quaternion, scaleVector.setScalar(Math.max(pose.scale, 1e-4)))
    const holder = group.parent
    if (holder) {
      holder.updateWorldMatrix(true, false)
      matrix.premultiply(holderInverse.copy(holder.matrixWorld).invert())
    }
    matrix.decompose(group.position, group.quaternion, group.scale)
  }

  /** Takes hold of the work and what was thrown into it, as they are now. */
  private seize() {
    const {spec} = this.fusion
    const list: Array<Satellite> = []
    // The work starts on the far side, toward its wall, so it barely detours on its way into orbit; the other one starts opposite.
    const phase = -Math.PI / 2 - 0.7
    const portraits = useGallery.getState().portraits
    const add = (kind: Satellite['kind'], id: string, body: RapierRigidBody, group: Object3D, scale: number, tumble?: Vector3) => {
      const start = poseOf(group)
      list.push({
        kind,
        id,
        body,
        group,
        orbit: {
          phase: kind === 'work' ? phase : phase + Math.PI,
          scale,
          start,
          home: kind === 'work' ? start : undefined,
          tumble,
        },
        pose: {
          position: new Vector3,
          quaternion: new Quaternion,
          scale: 1,
        },
        releasedScale: 1,
      })
    }
    const portraitScale = (id: string) => {
      const portrait = portraits.find(candidate => candidate.id === id)
      return portrait ? Math.min(1, satelliteSize / (Math.max(portrait.width, portrait.height) + 0.18)) : 1
    }
    const work = portraitObjects.get(spec.work.id)
    if (work) {
      add('work', spec.work.id, work.body, work.group, portraitScale(spec.work.id))
    }
    const {partner} = spec
    if (partner.kind === 'portrait') {
      const portrait = portraitObjects.get(partner.id)
      if (portrait) {
        add('portrait', partner.id, portrait.body, portrait.group, portraitScale(partner.id))
      }
    } else {
      const prop = propObjects.get(partner.id)
      // The player may have caught it again already.
      if (prop?.seize()) {
        box.setFromObject(prop.group)
        const size = Math.max(...box.getSize(offset))
        add('prop', partner.id, prop.body, prop.group, Math.min(1, propSize / Math.max(size, 1e-3)), tumbleAxis(partner.id))
      }
    }
    return list
  }
}
