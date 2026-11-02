import type {BufferGeometry, Camera, Frustum, Light, LightShadow, Matrix4, Object3D, PerspectiveCamera} from 'three/webgpu'

import {Sphere, Vector3} from 'three/webgpu'

type ShadowLight = Light & {
  distance?: number
  isDirectionalLight?: boolean
  isPointLight?: boolean
  isSpotLight?: boolean
  shadow: LightShadow<PerspectiveCamera>
}
type Caster = Object3D & {
  boundingSphere?: Sphere | null
  computeBoundingSphere?: () => void
  geometry: BufferGeometry
  instanceMatrix?: {version: number}
}
type CasterState = {
  frame: number
  geometry: BufferGeometry
  hidden: boolean
  instances: number
  matrix: Matrix4
  sphere: Sphere
}
type Change = {
  /** whether the caster was out of sight before and after, where lamps don’t draw it */
  hidden: boolean
  /** whether only its hiding changed, which directional lights don’t see */
  hiding: boolean
  sphere: Sphere
}
type LightState = {
  /** whether a caster changed out of sight since the map last rendered, which shows once its room does */
  deferred: boolean
  dirty: boolean
  frame: number
  matrix: Matrix4
}

const lightPosition = new Vector3
const lightReach = new Sphere
// Physics keeps settling bodies like the Sienna chandelier wobbling by fractions of a millimeter. A change only counts once it adds up to more than this, in meters and in rotation matrix elements.
const tolerance = 0.001
const moved = (from: Matrix4, to: Matrix4) => from.elements.some((value, i) => Math.abs(value - to.elements[i]) > tolerance)
const worldSphere = (caster: Caster, target: Sphere) => {
  // Instanced meshes bound all of their instances themselves.
  if (caster.computeBoundingSphere && caster.instanceMatrix) {
    caster.computeBoundingSphere()
  }
  if (!caster.boundingSphere && !caster.geometry.boundingSphere) {
    caster.geometry.computeBoundingSphere()
  }
  return target.copy(caster.boundingSphere ?? caster.geometry.boundingSphere!).applyMatrix4(caster.matrixWorld)
}

/** Whether the light can shine on anything inside the frustum, where its shadows would show; a point or spot light within its range or else its shadow camera’s, any other light everywhere. */
export function reachesFrustum(light: Light, frustum: Frustum) {
  const {distance, isPointLight, isSpotLight, matrixWorld, shadow} = light as ShadowLight
  if (!isPointLight && !isSpotLight) {
    return true
  }
  lightReach.center.setFromMatrixPosition(matrixWorld)
  lightReach.radius = distance || shadow.camera.far
  return frustum.intersectsSphere(lightReach)
}

/**
 * Lets shadow maps that left out objects still streaming in render again despite the cache, one map per frame, each in turn, since rendering them all every frame costs more than building their objects.
 * Visit every shadow-casting light of a frame, then call `endFrame`.
 */
export class ShadowRefresher {
  private readonly refreshed = new Set<Camera>
  private refreshing = false

  /** Ends the frame: once every incomplete map had its turn, the next round starts. */
  endFrame() {
    if (!this.refreshing) {
      this.refreshed.clear()
    }
    this.refreshing = false
  }

  /** Lets the light’s map render this frame if `incomplete` says it missed objects and no other map took this frame’s turn. */
  visit(light: Light & {shadow: LightShadow}, incomplete: (camera: Camera) => boolean) {
    const {camera} = light.shadow
    if (this.refreshing || this.refreshed.has(camera) || !incomplete(camera)) {
      return
    }
    light.shadow.needsUpdate = true
    this.refreshed.add(camera)
    this.refreshing = true
  }
}

/**
 * Keeps shadow maps until something changes in their light’s reach: a shadow caster that moves, appears or disappears, or the light itself moving.
 * Almost everything in the gallery stands still, so most lights render their shadow map once instead of every frame.
 * Directional lights shine from outside the culled rooms and draw hidden casters too, so hiding or showing a caster leaves their shadow maps alone. A caster changing out of sight only changes shadows nobody sees, so it waits until its room, or any other, shows again, or something in sight changes.
 * Lamps leave hidden casters out of their maps, so they only notice them coming into or going out of sight.
 */
export default class ShadowCache {
  private readonly casters = new Map<Caster, CasterState>
  private readonly changes: Array<Change> = []
  private frame = 0
  private readonly lights = new Map<ShadowLight, LightState>

  /** Restores three’s default of updating every shadow map every frame. */
  dispose() {
    for (const light of this.lights.keys()) {
      light.shadow.autoUpdate = true
    }
    this.lights.clear()
    this.casters.clear()
  }

  /**
   * Compares the scene with the last call and requests an update of every shadow map whose light can reach a change.
   * Call it once per frame, after the world matrices are up to date. Subtrees in `hidden` count as absent for all but directional lights, like in the renderer.
   * A light that isn’t `active` keeps its pending update until it is.
   */
  update(scene: Object3D, hidden: ReadonlySet<Object3D>, active: (light: Light) => boolean) {
    const frame = ++this.frame
    this.changes.length = 0
    const visit = (object: Object3D, isHidden: boolean) => {
      if (!object.visible) {
        return
      }
      const objectHidden = isHidden || hidden.has(object)
      const light = object as ShadowLight
      if (light.isLight) {
        if (light.castShadow) {
          this.trackLight(light, frame)
        }
      } else if (object.castShadow && 'geometry' in object) {
        this.trackCaster(object as Caster, frame, objectHidden)
      }
      for (const child of object.children) {
        visit(child, objectHidden)
      }
    }
    visit(scene, false)
    for (const [caster, state] of this.casters) {
      if (state.frame === frame) {
        continue
      }
      this.changes.push({
        hidden: state.hidden,
        hiding: false,
        sphere: state.sphere,
      })
      this.casters.delete(caster)
    }
    for (const [light, state] of this.lights) {
      if (state.frame !== frame) {
        light.shadow.autoUpdate = true
        this.lights.delete(light)
        continue
      }
      for (const change of this.changes) {
        if (state.dirty || !this.reaches(light, change.sphere)) {
          continue
        }
        if (!light.isDirectionalLight) {
          state.dirty = !change.hidden
        } else if (change.hiding) {
          // A room showing again brings into view what changed in it out of sight.
          state.dirty = state.deferred
        } else if (change.hidden) {
          state.deferred = true
        } else {
          state.dirty = true
        }
      }
      state.deferred &&= !state.dirty
      if (!(state.dirty && active(light))) {
        continue
      }
      light.shadow.needsUpdate = true
      state.dirty = false
    }
  }

  private reaches(light: ShadowLight, sphere: Sphere) {
    if (light.isPointLight) {
      const range = light.distance || light.shadow.camera.far
      return lightPosition.setFromMatrixPosition(light.matrixWorld).distanceTo(sphere.center) <= range + sphere.radius
    }
    light.shadow.updateMatrices(light)
    return light.shadow.getFrustum().intersectsSphere(sphere)
  }

  private trackCaster(caster: Caster, frame: number, hidden: boolean) {
    const instances = caster.instanceMatrix?.version ?? 0
    let state = this.casters.get(caster)
    if (!state) {
      state = {
        frame,
        geometry: caster.geometry,
        hidden,
        instances,
        matrix: caster.matrixWorld.clone(),
        sphere: worldSphere(caster, new Sphere),
      }
      this.casters.set(caster, state)
      this.changes.push({
        hidden,
        hiding: false,
        sphere: state.sphere,
      })
      return
    }
    state.frame = frame
    if (state.geometry === caster.geometry && state.instances === instances && !moved(state.matrix, caster.matrixWorld)) {
      if (state.hidden !== hidden) {
        state.hidden = hidden
        this.changes.push({
          hidden: false,
          hiding: true,
          sphere: state.sphere,
        })
      }
      return
    }
    // Both where it was and where it is now changed.
    this.changes.push({
      hidden: state.hidden,
      hiding: false,
      sphere: state.sphere.clone(),
    })
    state.geometry = caster.geometry
    state.hidden = hidden
    state.instances = instances
    state.matrix.copy(caster.matrixWorld)
    this.changes.push({
      hidden,
      hiding: false,
      sphere: worldSphere(caster, state.sphere),
    })
  }

  private trackLight(light: ShadowLight, frame: number) {
    const state = this.lights.get(light)
    if (!state) {
      // Its map has nothing to keep yet, so it renders right away, even in a room out of view.
      light.shadow.autoUpdate = false
      light.shadow.needsUpdate = true
      this.lights.set(light, {
        deferred: false,
        dirty: false,
        frame,
        matrix: light.matrixWorld.clone(),
      })
      return
    }
    state.frame = frame
    if (moved(state.matrix, light.matrixWorld)) {
      state.matrix.copy(light.matrixWorld)
      state.dirty = true
    }
  }
}
