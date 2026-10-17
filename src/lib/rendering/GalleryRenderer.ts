import type {WebgpuRendererOptions} from 'three-fiber-game'
import type {Camera, Object3D, Scene} from 'three/webgpu'

import {WebgpuRenderer} from 'three-fiber-game'
import {Renderer} from 'three/webgpu'

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
  private warmedFrame = -1
  private warming = false
  private readonly warmObjects = new WeakSet<Object3D>
  private warmupAdmissions = 0

  constructor(options: WebgpuRendererOptions) {
    super({
      ...options,
      alpha: false,
      antialias: false,
      trackTimestamp: telemetry !== null,
    })
    LanternLightNode.register(this.library)
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
    internals._projectObject = (object, camera, groupOrder, renderList, clippingContext) => {
      if (this.hidden.has(object)) {
        return
      }
      if (!this.warming || !object.frustumCulled || !('geometry' in object)) {
        projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
        return
      }
      if (!this.warmObjects.has(object)) {
        if (this.warmupAdmissions >= warmupObjectsPerFrame) {
          // Postpone the rest of the scene to the next frames.
          this.warmedFrame = -1
          projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
          return
        }
        this.warmupAdmissions++
        this.warmObjects.add(object)
      }
      object.frustumCulled = false
      try {
        projectObject.call(this, object, camera, groupOrder, renderList, clippingContext)
      } finally {
        object.frustumCulled = true
      }
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
    this.frameScene!.updateMatrixWorld()
  }
}

export const createGalleryRenderer = (options: WebgpuRendererOptions) => new GalleryRenderer(options)
