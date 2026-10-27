import type {WebgpuRendererOptions} from 'three-fiber-game'
import type {Camera, Scene} from 'three/webgpu'

import {WebgpuRenderer} from 'three-fiber-game'
import {Object3D, Renderer} from 'three/webgpu'

import {isDevelopmentMode} from '#src/lib/developmentMode.ts'
import {BatchedLighting} from '#src/lib/materials/lights/base/BatchedLightsNode.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'

import {cinematicMaxTextureSize, readCinematicGraphics} from './graphicsMode.ts'

type Culler = (camera: Camera) => void
type RenderObject = {scene: Object3D}
type PromiseSink = {push: (promise: Promise<void>) => void}
type ProjectObject = (this: Renderer, object: Object3D, camera: Camera, groupOrder: number, renderList: unknown, clippingContext: unknown) => void
/** WebGPUBackend parameters three doesn’t type, which it reads when it requests the device in `init` */
type BackendInternals = {parameters: {
  device?: GPUDevice
  powerPreference?: GPUPowerPreference
  requiredLimits: Record<string, number>
}}
/** bytes per pixel of all render targets of a pass, which screen-space reflections exceed with a fifth half-float target; WebGPU guarantees 32 and desktop GPUs offer 64 or more */
const wideColorAttachmentBytes = 64
/** sampled textures per shader stage that cinematic asks for; its heaviest fragment shaders sample 18, above the 16 WebGPU guarantees */
const cinematicSampledTextures = 32
/** Renderer internals that three doesn’t type. */
type Internals = {
  _currentRenderBundle: unknown
  _nodes: {
    getForRender: (renderObject: RenderObject) => unknown
    nodeFrame: {frameId: number}
  }
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
// Milliseconds a streaming frame may spend building the node graphs of objects drawn for the first time in a pass. Building happens synchronously, from a few milliseconds per object to over a hundred for the heaviest; a frame always admits at least one.
const streamedBuildBudget = 4
/** frames in a row without anything left to stream after which streaming stops */
const streamedIdleFrames = 300
/** how streaming picks the objects to build: `all` builds the rest of the scene after the prioritized objects, `priority` only ever builds prioritized ones */
export type StreamingMode = 'all' | 'priority'

/**
 * Instruments real lifecycle operations and keeps per-frame work in the frame scene to once per frame:
 * matrices update before the first pass and pipelines compile in the background instead of blocking the GPU process.
 */
export class GalleryRenderer extends WebgpuRenderer {
  /** objects that every pass of the current frame skips, including their children */
  readonly hidden = new Set<Object3D>
  /** objects that only the camera and its reflection leave out, while shadow maps keep them as casters */
  readonly hiddenFromView = new Set<Object3D>
  /** the cameras of shadow maps, which draw {@link hiddenFromView} */
  readonly shadowCameras = new WeakSet<Camera>
  /** the cameras of shadow maps of lights from outside the rooms, like the sun, which draw {@link hidden} too */
  readonly unculledCameras = new WeakSet<Camera>
  /** the recent average of milliseconds spent building per object streaming admitted */
  private buildCost = 10
  /** milliseconds this frame spent building node graphs */
  private buildTime = 0
  private culledCamera: Camera | null = null
  private culler: Culler | null = null
  private frame = -1
  private frameScene: Scene | null = null
  /** shadow cameras that left out objects not built yet this frame */
  private gatedCameras = new Set<Camera>
  /** shadow cameras that left out objects not built yet last frame, so their maps must render again */
  private incompleteCameras = new Set<Camera>
  private initialization?: Promise<this>
  private pending = 0
  /** projects objects outside of loading, leaving out {@link hidden} outside of {@link unculledCameras} and, outside of shadow maps, {@link hiddenFromView} */
  private projectCulled?: ProjectObject
  private projectStreaming?: ProjectObject
  /** projects objects while loading, admitting the next ones outside the frustum */
  private projectWarming?: ProjectObject
  private streamFound = false
  private streamIdle = 0
  private streaming: StreamingMode | null = null
  private streamPriority: ((object: Object3D) => boolean) | null = null
  private streamPriorityFound = false
  private streamRest = false
  private warmedFrame = -1
  private warming = false
  /** the cameras each object was drawn for outside their frustum while loading */
  private readonly warmObjects = new WeakMap<Object3D, Set<Camera>>
  private warmupAdmissions = 0

  constructor(options: WebgpuRendererOptions) {
    super({
      ...options,
      requiredLimits: {
        ...readCinematicGraphics() ? {maxTextureDimension2D: cinematicMaxTextureSize} : {},
        ...isDevelopmentMode || readCinematicGraphics() ? {maxColorAttachmentBytesPerSample: wideColorAttachmentBytes} : {},
      },
      alpha: false,
      antialias: false,
      trackTimestamp: telemetry !== null,
    })
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
    this.initialization ??= this.requestCinematicLimits().then(() => (telemetry ? telemetry.wrap('three.init', () => super.init()) : super.init())).then(renderer => {
      this.compilePipelinesAsync()
      return renderer
    })
    return this.initialization
  }

  /**
   * Runs passes of the frame scene that belong to the camera’s frame, such as its reflection rendered ahead of it, with the frame’s matrices and the camera’s culling.
   * Shadow faces and reflections render the same scene again within a frame. They reuse the matrices of the first pass instead of walking the whole scene graph every time.
   */
  prepass(scene: Object3D, camera: Camera, pass: () => void) {
    if (scene !== this.frameScene || !scene.matrixWorldAutoUpdate) {
      pass()
      return
    }
    this.startFrame()
    if (this.culler && this.culledCamera !== camera) {
      this.culledCamera = camera
      this.culler(camera)
    }
    scene.matrixWorldAutoUpdate = false
    try {
      pass()
    } finally {
      scene.matrixWorldAutoUpdate = true
    }
  }

  override render(scene: Object3D, camera: Camera) {
    if (scene !== this.frameScene || !scene.matrixWorldAutoUpdate) {
      super.render(scene, camera)
      return
    }
    this.prepass(scene, camera, () => {
      super.render(scene, camera)
    })
  }

  /** Sets the function that fills {@link hidden} for the camera of each frame, once the frame’s matrices are up to date. */
  setCuller(culler: Culler | null) {
    this.culler = culler
    this.culledCamera = null
    this.hidden.clear()
    this.hiddenFromView.clear()
  }

  /** Sets the scene the game renders every frame, together with its shadow and reflection passes. */
  setFrameScene(scene: Scene | null) {
    this.frameScene = scene
  }

  /**
   * Builds the objects not drawn in a pass yet a few per frame after loading, instead of all at once when they first come into view. Until then, a pass leaves them out.
   * Objects the priority accepts come first; with `all`, the rest follows once no prioritized one is left, and streaming stops after a while without anything left to build.
   */
  setStreaming(streaming: StreamingMode | null) {
    this.streaming = streaming
    this.streamIdle = 0
    this.incompleteCameras.clear()
    this.gatedCameras.clear()
    this.installProjection()
  }

  /** Sets which objects streaming builds first, all by default. */
  setStreamPriority(priority: ((object: Object3D) => boolean) | null) {
    this.streamPriority = priority
  }

  /** Draws every object of the frame scene in every pass, regardless of the camera frustum, so that all their pipelines compile while loading. */
  setWarming(warming: boolean) {
    this.warming = warming
    this.installProjection()
  }

  /** Whether the shadow map of this camera left out objects that streaming hasn’t built yet, so it must render again. */
  streamingIncomplete(camera: Camera) {
    return this.incompleteCameras.has(camera)
  }

  /** Carries what the last streaming frame found over to the next one. */
  private advanceStreaming() {
    if (this.warmupAdmissions > 0) {
      this.buildCost = this.buildCost * 0.7 + this.buildTime / this.warmupAdmissions * 0.3
    }
    // Everything else waits while prioritized objects are left.
    this.streamRest = this.streaming === 'all' && !this.streamPriorityFound
    this.streamIdle = this.streamFound ? 0 : this.streamIdle + 1
    const incomplete = this.gatedCameras
    this.gatedCameras = this.incompleteCameras
    this.gatedCameras.clear()
    this.incompleteCameras = incomplete
    this.streamFound = false
    this.streamPriorityFound = false
    // With only the prioritized objects to build, the priority changes as the player moves, so streaming never runs out.
    if (this.streaming === 'all' && this.streamIdle > streamedIdleFrames) {
      this.setStreaming(null)
    }
  }

  /** Replaces three’s synchronous pipeline creation for the frame scene. Objects are drawn once their pipeline is ready, so a new variant no longer stalls the frame. */
  private compilePipelinesAsync() {
    const internals = this.internals
    const pipelines = internals._pipelines
    const nodes = internals._nodes
    const buildNodes = nodes.getForRender.bind(nodes)
    // Only objects new to a pass build their node graphs, so timing them costs nothing in a settled frame.
    nodes.getForRender = renderObject => {
      const start = performance.now()
      try {
        return buildNodes(renderObject)
      } finally {
        this.buildTime += performance.now() - start
      }
    }
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
    const {hidden, hiddenFromView, shadowCameras, unculledCameras} = this
    this.projectCulled = function (this: Renderer, object, camera, groupOrder, renderList, clippingContext) {
      if ((!hidden.has(object) || unculledCameras.has(camera)) && (!hiddenFromView.has(object) || shadowCameras.has(camera))) {
        projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
      }
    }
    this.projectWarming = (object, camera, groupOrder, renderList, clippingContext) => {
      if (hidden.has(object) && !unculledCameras.has(camera)) {
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
    this.projectStreaming = (object, camera, groupOrder, renderList, clippingContext) => {
      const culled = hidden.has(object) && !unculledCameras.has(camera) || hiddenFromView.has(object) && !shadowCameras.has(camera)
      const cameras = this.warmObjects.get(object)
      if (!object.visible || !object.layers.test(camera.layers) || !object.frustumCulled || !('geometry' in object) || cameras?.has(camera)) {
        if (!culled) {
          projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
        }
        return
      }
      const priority = this.streamPriority?.(object) ?? true
      this.streamPriorityFound ||= priority
      this.streamFound ||= priority || this.streaming === 'all'
      if (!(priority || this.streamRest) || this.warmupAdmissions > 0 && (this.buildTime >= streamedBuildBudget || (this.warmupAdmissions + 1) * this.buildCost > streamedBuildBudget)) {
        // Left out until its turn; its children still go their own way.
        // Only objects that will get their turn keep the shadow map rendering.
        if (shadowCameras.has(camera) && (priority || this.streaming === 'all')) {
          this.gatedCameras.add(camera)
        }
        for (const child of object.children) {
          this.internals._projectObject.call(this, child, camera, groupOrder, renderList, clippingContext)
        }
        return
      }
      this.warmupAdmissions++
      if (cameras) {
        cameras.add(camera)
      } else {
        this.warmObjects.set(object, new Set([camera]))
      }
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
    const project = this.warming ? this.projectWarming : (this.streaming ? this.projectStreaming : this.projectCulled)
    if (project) {
      this.internals._projectObject = project
    }
  }

  /** Raises the sampled texture limit for cinematic to what the adapter offers, up to {@link cinematicSampledTextures}, so GPUs with fewer still get a device. */
  private async requestCinematicLimits() {
    const {parameters} = this.backend as unknown as BackendInternals
    if (!readCinematicGraphics() || parameters.device !== undefined || typeof navigator === 'undefined' || !('gpu' in navigator)) {
      return
    }
    // three requests the same GPU, so its device can get these limits.
    const adapter = await navigator.gpu.requestAdapter({powerPreference: parameters.powerPreference})
    if (adapter) {
      parameters.requiredLimits.maxSampledTexturesPerShaderStage = Math.min(cinematicSampledTextures, adapter.limits.maxSampledTexturesPerShaderStage)
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
    if (this.streaming) {
      this.advanceStreaming()
    }
    this.warmupAdmissions = 0
    this.buildTime = 0
    updateChangedMatrices(this.frameScene!, false)
  }
}

export const createGalleryRenderer = (options: WebgpuRendererOptions) => new GalleryRenderer(options)
