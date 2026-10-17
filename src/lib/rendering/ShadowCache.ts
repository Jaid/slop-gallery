import type {BufferGeometry, Light, LightShadow, Object3D, PerspectiveCamera} from 'three/webgpu'

import {Matrix4, Sphere, Vector3} from 'three/webgpu'

type ShadowLight = Light & {
  distance?: number
  isDirectionalLight?: boolean
  isPointLight?: boolean
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
  instances: number
  matrix: Matrix4
  sphere: Sphere
}
type LightState = {
  dirty: boolean
  frame: number
  matrix: Matrix4
}

const lightPosition = new Vector3

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

/**
 * Keeps shadow maps until something changes in their light’s reach: a shadow caster that moves, appears or disappears, or the light itself moving.
 * Almost everything in the gallery stands still, so most lights render their shadow map once instead of every frame.
 */
export default class ShadowCache {
  private readonly casters = new Map<Caster, CasterState>()
  private readonly changes: Array<Sphere> = []
  private frame = 0
  private readonly lights = new Map<ShadowLight, LightState>()

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
   * Call it once per frame, after the world matrices are up to date. Subtrees in `hidden` count as absent, like in the renderer.
   * A light that isn’t `active` keeps its pending update until it is.
   */
  update(scene: Object3D, hidden: ReadonlySet<Object3D>, active: (light: Light) => boolean) {
    const frame = ++this.frame
    this.changes.length = 0
    const visit = (object: Object3D) => {
      if (!object.visible || hidden.has(object)) {
        return
      }
      const light = object as ShadowLight
      if (light.isLight) {
        if (light.castShadow && light.shadow) {
          this.trackLight(light, frame)
        }
      } else if (object.castShadow && 'geometry' in object) {
        this.trackCaster(object as Caster, frame)
      }
      for (const child of object.children) {
        visit(child)
      }
    }
    visit(scene)
    for (const [caster, state] of this.casters) {
      if (state.frame !== frame) {
        this.changes.push(state.sphere)
        this.casters.delete(caster)
      }
    }
    for (const [light, state] of this.lights) {
      if (state.frame !== frame) {
        light.shadow.autoUpdate = true
        this.lights.delete(light)
        continue
      }
      state.dirty ||= this.changes.some(sphere => this.reaches(light, sphere))
      if (state.dirty && active(light)) {
        light.shadow.needsUpdate = true
        state.dirty = false
      }
    }
  }

  private reaches(light: ShadowLight, sphere: Sphere) {
    if (light.isPointLight) {
      const range = light.distance || light.shadow.camera.far
      return light.getWorldPosition(lightPosition).distanceTo(sphere.center) <= range + sphere.radius
    }
    light.shadow.updateMatrices(light)
    return light.shadow.getFrustum().intersectsSphere(sphere)
  }

  private trackCaster(caster: Caster, frame: number) {
    const instances = caster.instanceMatrix?.version ?? 0
    let state = this.casters.get(caster)
    if (!state) {
      state = {
        frame,
        geometry: caster.geometry,
        instances,
        matrix: caster.matrixWorld.clone(),
        sphere: worldSphere(caster, new Sphere),
      }
      this.casters.set(caster, state)
      this.changes.push(state.sphere)
      return
    }
    state.frame = frame
    if (state.geometry === caster.geometry && state.instances === instances && state.matrix.equals(caster.matrixWorld)) {
      return
    }
    // Both where it was and where it is now changed.
    this.changes.push(state.sphere.clone())
    state.geometry = caster.geometry
    state.instances = instances
    state.matrix.copy(caster.matrixWorld)
    this.changes.push(worldSphere(caster, state.sphere))
  }

  private trackLight(light: ShadowLight, frame: number) {
    const state = this.lights.get(light)
    if (!state) {
      light.shadow.autoUpdate = false
      this.lights.set(light, {
        dirty: true,
        frame,
        matrix: light.matrixWorld.clone(),
      })
      return
    }
    state.frame = frame
    if (!state.matrix.equals(light.matrixWorld)) {
      state.matrix.copy(light.matrixWorld)
      state.dirty = true
    }
  }
}
