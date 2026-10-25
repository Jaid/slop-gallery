import type {Camera, Light, Object3D} from 'three/webgpu'

import {Frustum, Matrix4, PointLight, Sphere, Vector3} from 'three/webgpu'

import {isShadowSlot, lightShadow, shadowSlotKey, useLightEdits} from './lightLevels.ts'

/** how many shadow-casting point lights the pool keeps; each one costs every lit pixel, in use or not */
export const shadowSlotCount = 4
/** how far a slot’s shadow reaches when its light has no cutoff, in meters */
const openReach = 30
/** an empty slot belongs to no room, so nothing waits for its shadow map */
const nowhere: ReadonlyArray<string> = []

type Candidate = {
  distance: number
  inView: boolean
  light: PointLight
}

const frustum = new Frustum
const projection = new Matrix4
const local = new Matrix4
const world = new Matrix4
const reach = new Sphere
const cameraPosition = new Vector3
/** where an object is this frame; its world matrix only catches up when the frame is drawn, a frame late for whatever moved since, like a light swinging with a physics body, so this composes it afresh without touching any matrix */
const currentPosition = (object: Object3D, target: Vector3) => {
  world.identity()
  for (let current: Object3D | null = object; current; current = current.parent) {
    world.premultiply(current.matrixAutoUpdate ? local.compose(current.position, current.quaternion, current.scale) : current.matrix)
  }
  return target.setFromMatrixPosition(world)
}

/** whether a light asks for a shadow: its `userData.shadow`, unless the light editor switched it */
export function wantsShadow(light: Light) {
  return useLightEdits.getState().shadows.get(light) ?? Boolean(light.userData.shadow)
}

/**
 * A fixed set of shadow-casting point lights lent to the shadowless point lights that ask for a shadow with `userData.shadow`.
 *
 * Every shadow-casting light adds its own lighting and shadow code to every lit material, and switching `castShadow` rebuilds them all. The pool’s lights always exist and always cast,
 * so lending them out never rebuilds anything: a slot takes over its light’s place, color, reach and strength, and the batched loop skips the light while it is lent a slot.
 * A light keeps its slot until it goes dark or stops asking. Lights out of view never take a slot; lights in view take free slots first, nearest first, then those of lights out of view. Any left over go without.
 */
export class ShadowPool {
  /** called once whenever more lights in view ask for a shadow than there are slots, with all of them; not again until they fit */
  onOverflow: ((lights: ReadonlyArray<PointLight>) => void) | undefined
  readonly slots: ReadonlyArray<PointLight>
  private readonly lent = new Map<PointLight, PointLight>
  private overflowing = false
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
      if (!wantsShadow(light)) {
        return
      }
      reach.center.setFromMatrixPosition(light.matrixWorld)
      reach.radius = light.distance
      candidates.set(light, {
        distance: reach.center.distanceTo(cameraPosition),
        inView: light.distance <= 0 || frustum.intersectsSphere(reach),
        light,
      })
    })
    const inView = candidates.values().filter(candidate => candidate.inView).map(candidate => candidate.light).toArray()
    const overflowing = inView.length > this.slots.length
    if (overflowing && !this.overflowing) {
      this.onOverflow?.(inView)
    }
    this.overflowing = overflowing
    for (const [index, source] of this.sources.entries()) {
      if (source && !candidates.has(source)) {
        this.sources[index] = null
      }
    }
    const waiting = candidates.values().filter(candidate => candidate.inView && !this.sources.includes(candidate.light)).toArray().toSorted((a, b) => a.distance - b.distance)
    for (const candidate of waiting) {
      const index = this.slotFor(candidates)
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
      currentPosition(source, slot.position)
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
    this.overflowing = false
    this.sources.fill(null)
    this.lent.clear()
  }

  /** a free slot, else that of a light out of view */
  private slotFor(candidates: ReadonlyMap<PointLight, Candidate>) {
    const free = this.sources.indexOf(null)
    if (free !== -1) {
      return free
    }
    const index = this.sources.findIndex(source => !candidates.get(source!)!.inView)
    return index === -1 ? undefined : index
  }
}

/** the pool every scene shares; it only lends slots while they are mounted, which the gallery does */
export const shadowPool = new ShadowPool(shadowSlotCount)
