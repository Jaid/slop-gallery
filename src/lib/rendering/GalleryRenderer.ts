import type {WebgpuRendererOptions} from 'three-fiber-game'
import type {Camera, Scene} from 'three/webgpu'

import {WebgpuRenderer} from 'three-fiber-game'
import {Object3D, Renderer} from 'three/webgpu'

import {BatchedLighting} from '#src/lib/materials/lights/base/BatchedLightsNode.ts'
import LanternLightNode from '#src/lib/materials/lights/LanternLightNode.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'

type Culler = (camera: Camera) => void
type RenderObject = {scene: Object3D}
type PromiseSink = {push: (promise: Promise<void>) => void}
type ProjectObject = (this: Renderer, object: Object3D, camera: Camera, groupOrder: number, renderList: unknown, clippingContext: unknown) => void
/** Renderer internals that three doesn’t type. */
type Internals = {
  _currentRenderBundle: unknown
  _nodes: {nodeFrame: {frameId: number}}
  _pipelines: {
    getForRender: (renderObject: RenderObject, promises: PromiseSink | null) => unknown
    updateForRender: (renderObject: RenderObject) => void
  }
  _projectObject: ProjectObject
}

const projectObject = (Renderer.prototype as unknown as Internals)._projectObject
// eslint-disable-next-line typescript/unbound-method -- Only compared, to find classes that override it.
const updateMatrixWorld = Object3D.prototype.updateMatrixWorld
/** each object’s position, quaternion and scale when its matrix was last composed */
const poses = new WeakMap<Object3D, Float64Array>
const parents = new WeakMap<Object3D, Object3D | null>
/**
 * Like `updateMatrixWorld`, but only composes matrices whose transform or parent changed since the last call.
 * three recomposes every matrix of the scene each frame, although almost nothing in the gallery moves.
 */
export const updateChangedMatrices = (object: Object3D, parentChanged: boolean) => {
  // Cameras and other classes with their own bookkeeping keep three’s update.
  if (object.updateMatrixWorld !== updateMatrixWorld) {
    object.updateMatrixWorld(parentChanged)
    return
  }
  let changed = parentChanged
  if (parents.get(object) !== object.parent) {
    parents.set(object, object.parent)
    changed = true
  }
  if (object.matrixAutoUpdate) {
    const {position: p, quaternion: q, scale: s} = object
    let pose = poses.get(object)
    if (!pose) {
      pose = new Float64Array(10)
      poses.set(object, pose)
      pose[0] = Number.NaN
    }
    if (pose[0] !== p.x || pose[1] !== p.y || pose[2] !== p.z || pose[3] !== q.x || pose[4] !== q.y || pose[5] !== q.z || pose[6] !== q.w || pose[7] !== s.x || pose[8] !== s.y || pose[9] !== s.z) {
      pose.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w, s.x, s.y, s.z])
      object.updateMatrix()
    }
  }
  if (object.matrixWorldNeedsUpdate || changed) {
    if (object.matrixWorldAutoUpdate) {
      if (object.parent) {
        object.matrixWorld.multiplyMatrices(object.parent.matrixWorld, object.matrix)
      } else {
        object.matrixWorld.copy(object.matrix)
      }
    }
    object.matrixWorldNeedsUpdate = false
    changed = true
  }
  for (const child of object.children) {
    if (child.matrixWorldAutoUpdate || changed) {
      updateChangedMatrices(child, changed)
    }
  }
}
// Objects a warming frame may draw outside the camera frustum. Their first draw builds their node graphs synchronously, so a cap keeps every loading frame short.
const warmupObjectsPerFrame = 48

/**
 * Instruments real lifecycle operations and keeps per-frame work in the frame scene to once per frame:
 * matrices update before the first pass and pipelines compile in the background instead of blocking the GPU process.
 */
export class GalleryRenderer extends WebgpuRenderer {
  /** objects that every pass of the current frame skips, including their children */
  readonly hidden = new Set<Object3D>
  private culledCamera: Camera | null = null
  private culler: Culler | null = null
  private frame = -1
  private frameScene: Scene | null = null
  private initialization?: Promise<this>
  private pending = 0
  /** projects objects outside of loading, leaving out {@link hidden} */
  private projectCulled?: ProjectObject
  /** projects objects while loading, admitting the next ones outside the frustum */
  private projectWarming?: ProjectObject
  private warmedFrame = -1
  private warming = false
  /** the cameras each object was drawn for outside their frustum while loading */
  private readonly warmObjects = new WeakMap<Object3D, Set<Camera>>
  private warmupAdmissions = 0

  constructor(options: WebgpuRendererOptions) {
    super({
      ...options,
      alpha: false,
      antialias: false,
      trackTimestamp: telemetry !== null,
    })
    LanternLightNode.register(this.library)
    this.lighting = new BatchedLighting
  }

  private get internals() {
    return this as unknown as Internals
  }

  /** the number of render pipelines that are still compiling in the background */
  get pendingPipelines() {
    return this.pending
  }

  /** whether the last warming frame drew every object in the frame scene and no pipeline is still compiling */
  get warm() {
    return this.warmedFrame === this.frame && this.pending === 0
  }

  override compileAsync(scene: Object3D, camera: Camera, targetScene?: Scene | null) {
    return telemetry ? telemetry.wrap('three.compile', () => super.compileAsync(scene, camera, targetScene)) : super.compileAsync(scene, camera, targetScene)
  }

  override init(): Promise<this> {
    this.initialization ??= (telemetry ? telemetry.wrap('three.init', () => super.init()) : super.init()).then(renderer => {
      this.compilePipelinesAsync()
      return renderer
    })
    return this.initialization
  }

  override render(scene: Object3D, camera: Camera) {
    if (scene !== this.frameScene || !scene.matrixWorldAutoUpdate) {
      super.render(scene, camera)
      return
    }
    // Shadow faces and reflections render the same scene again within a frame. Reuse the matrices of the first pass instead of walking the whole scene graph every time.
    this.startFrame()
    if (this.culler && this.culledCamera !== camera) {
      this.culledCamera = camera
      this.culler(camera)
    }
    scene.matrixWorldAutoUpdate = false
    try {
      super.render(scene, camera)
    } finally {
      scene.matrixWorldAutoUpdate = true
    }
  }

  /** Sets the function that fills {@link hidden} for the camera of each frame, once the frame’s matrices are up to date. */
  setCuller(culler: Culler | null) {
    this.culler = culler
    this.culledCamera = null
    this.hidden.clear()
  }

  /** Sets the scene the game renders every frame, together with its shadow and reflection passes. */
  setFrameScene(scene: Scene | null) {
    this.frameScene = scene
  }

  /** Draws every object of the frame scene in every pass, regardless of the camera frustum, so that all their pipelines compile while loading. */
  setWarming(warming: boolean) {
    this.warming = warming
    this.installProjection()
  }

  /** Replaces three’s synchronous pipeline creation for the frame scene. Objects are drawn once their pipeline is ready, so a new variant no longer stalls the frame. */
  private compilePipelinesAsync() {
    const internals = this.internals
    const pipelines = internals._pipelines
    const sink: PromiseSink = {
      push: promise => {
        this.pending++
        const settle = () => {
          this.pending--
        }
        void promise.then(settle, settle)
      },
    }
    // A render bundle records its draws once, so an object missing from it would stay missing.
    pipelines.updateForRender = renderObject => pipelines.getForRender(renderObject, renderObject.scene === this.frameScene && internals._currentRenderBundle === null ? sink : null)
    const {hidden} = this
    this.projectCulled = function (this: Renderer, object, camera, groupOrder, renderList, clippingContext) {
      if (!hidden.has(object)) {
        projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
      }
    }
    this.projectWarming = (object, camera, groupOrder, renderList, clippingContext) => {
      if (hidden.has(object)) {
        return
      }
      if (!object.frustumCulled || !('geometry' in object)) {
        projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
        return
      }
      let cameras = this.warmObjects.get(object)
      if (!cameras) {
        if (this.warmupAdmissions >= warmupObjectsPerFrame) {
          // Postpone the rest of the scene to the next frames.
          this.warmedFrame = -1
          projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
          return
        }
        this.warmupAdmissions++
        cameras = new Set
        this.warmObjects.set(object, cameras)
      }
      // One draw per pass requests the object’s pipelines. Drawing it outside the frustum again would only redo the work, which in every shadow map of every loading frame adds up to seconds.
      if (cameras.has(camera)) {
        // Shadow maps drawn while loading are redrawn once the shadow cache takes over, so they only draw what still needs its pipelines.
        if (!this.frameScene?.overrideMaterial) {
          projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
        }
        return
      }
      cameras.add(camera)
      object.frustumCulled = false
      try {
        projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
      } finally {
        object.frustumCulled = true
      }
    }
    this.installProjection()
  }

  /** Projection runs for every object of every pass, so outside of loading it does nothing but leave out {@link hidden}. */
  private installProjection() {
    const project = this.warming ? this.projectWarming : this.projectCulled
    if (project) {
      this.internals._projectObject = project
    }
  }

  private startFrame() {
    const {frameId} = this.internals._nodes.nodeFrame
    if (this.frame === frameId) {
      return
    }
    this.frame = frameId
    this.culledCamera = null
    this.warmedFrame = this.warming && this.warmupAdmissions === 0 ? frameId : -1
    this.warmupAdmissions = 0
    updateChangedMatrices(this.frameScene!, false)
  }
}

export const createGalleryRenderer = (options: WebgpuRendererOptions) => new GalleryRenderer(options)
