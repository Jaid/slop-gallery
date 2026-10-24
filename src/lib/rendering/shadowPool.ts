import type {Camera, Light, Object3D} from 'three/webgpu'

import {Frustum, Matrix4, PointLight, Sphere, Vector3} from 'three/webgpu'

import {isShadowSlot, lightShadow, shadowSlotKey, useLightEdits} from './lightLevels.ts'

/** how many shadow-casting point lights the pool keeps; each one costs every lit pixel, in use or not */
export const shadowSlotCount = 4
/** the priority of a light the light editor gave a shadow without one of its own */
const editedPriority = 1
/** how far a slot’s shadow reaches when its light has no cutoff, in meters */
const openReach = 30
/** an empty slot belongs to no room, so nothing waits for its shadow map */
const nowhere: ReadonlyArray<string> = []

type Candidate = {
  distance: number
  inView: boolean
  light: PointLight
  priority: number
}

const frustum = new Frustum
const projection = new Matrix4
const reach = new Sphere
const cameraPosition = new Vector3

/**
 * The priority a light asks for a shadow with: `userData.shadow` as a number, 1 for `true`, or what the light editor switched; undefined for lights that don’t ask.
 * Higher priorities win slots over lower ones.
 */
export function shadowPriority(light: Light) {
  const own = light.userData.shadow as boolean | number | undefined
  const ownPriority = typeof own === 'number' ? own : (own ? 1 : undefined)
  const edited = useLightEdits.getState().shadows.get(light)
  if (edited === undefined) {
    return ownPriority
  }
  return edited ? ownPriority ?? editedPriority : undefined
}

/**
 * A fixed set of shadow-casting point lights lent to the shadowless point lights that ask for a shadow with `userData.shadow`.
 *
 * Every shadow-casting light adds its own lighting and shadow code to every lit material, and switching `castShadow` rebuilds them all. The pool’s lights always exist and always cast,
 * so lending them out never rebuilds anything: a slot takes over its light’s place, color, reach and strength, and the batched loop skips the light while it is lent a slot.
 * A light keeps its slot until it goes dark or stops asking. Lights out of view never take a slot; lights in view take free slots first, then those of lights out of view, then those of lights with a lower priority.
 */
export class ShadowPool {
  readonly slots: ReadonlyArray<PointLight>
  private readonly lent = new Map<PointLight, PointLight>
  private readonly sources: Array<PointLight | null>

  constructor(count: number) {
    this.slots = Array.from({length: count}, (_, index) => {
      const slot = new PointLight('#ffffff', 0)
      slot.name = `shadow-slot-${index}`
      slot.castShadow = true
      slot.shadow.camera.near = 0.1
      slot.shadow.normalBias = 0.035
      slot.userData[shadowSlotKey] = true
      slot.userData.rooms = nowhere
      return slot
    })
    this.sources = this.slots.map(() => null)
  }

  /** whether a light is lent a slot, so the slot shades it instead */
  isLent(light: Light) {
    return this.lent.has(light as PointLight)
  }

  /** Hands out the slots for this frame and copies each lent light onto its slot. Call it after the lights’ levels are applied, so slots copy their final strength. */
  update(scene: Object3D, camera: Camera) {
    // Slots outside the scene would leave the lights they shade dark.
    let root: Object3D = this.slots[0]
    while (root.parent) {
      root = root.parent
    }
    if (root !== scene) {
      this.release()
      return
    }
    camera.getWorldPosition(cameraPosition)
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), camera.coordinateSystem, camera.reversedDepth)
    const candidates = new Map<PointLight, Candidate>
    scene.traverseVisible(object => {
      const light = object as PointLight
      if (!light.isPointLight || light.castShadow || isShadowSlot(light) || light.intensity <= 0) {
        return
      }
      const priority = shadowPriority(light)
      if (priority === undefined) {
        return
      }
      reach.center.setFromMatrixPosition(light.matrixWorld)
      reach.radius = light.distance
      candidates.set(light, {
        distance: reach.center.distanceTo(cameraPosition),
        inView: light.distance <= 0 || frustum.intersectsSphere(reach),
        light,
        priority,
      })
    })
    for (const [index, source] of this.sources.entries()) {
      if (source && !candidates.has(source)) {
        this.sources[index] = null
      }
    }
    const waiting = candidates.values().filter(candidate => candidate.inView && !this.sources.includes(candidate.light)).toArray().toSorted((a, b) => b.priority - a.priority || a.distance - b.distance)
    for (const candidate of waiting) {
      const index = this.slotFor(candidate, candidates)
      if (index === undefined) {
        continue
      }
      this.sources[index] = candidate.light
    }
    this.lent.clear()
    for (const [index, slot] of this.slots.entries()) {
      const source = this.sources[index]
      if (!source) {
        slot.intensity = 0
        slot.userData.rooms = nowhere
        continue
      }
      this.lent.set(source, slot)
      slot.position.setFromMatrixPosition(source.matrixWorld)
      slot.color.copy(source.color)
      slot.intensity = source.intensity
      slot.distance = source.distance
      slot.decay = source.decay
      slot.userData.rooms = undefined
      slot.shadow.intensity = lightShadow.current(source)
      const far = source.distance || openReach
      if (slot.shadow.camera.far === far) {
        continue
      }
      slot.shadow.camera.far = far
      slot.shadow.camera.updateProjectionMatrix()
    }
  }

  private release() {
    this.sources.fill(null)
    this.lent.clear()
  }

  /** a free slot, else that of a light out of view, else that of the light with the lowest priority below the candidate’s */
  private slotFor(candidate: Candidate, candidates: ReadonlyMap<PointLight, Candidate>) {
    const free = this.sources.indexOf(null)
    if (free !== -1) {
      return free
    }
    let result: number | undefined
    let lowest = candidate.priority
    for (const [index, source] of this.sources.entries()) {
      const held = candidates.get(source!)!
      if (!held.inView) {
        return index
      }
      if (held.priority >= lowest) {
        continue
      }
      lowest = held.priority
      result = index
    }
    return result
  }
}

/** the pool every scene shares; it only lends slots while they are mounted, which the gallery does */
export const shadowPool = new ShadowPool(shadowSlotCount)
