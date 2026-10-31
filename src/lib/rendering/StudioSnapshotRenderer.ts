import type {NodeFrame, Object3D} from 'three/webgpu'

import {WebgpuRenderer} from 'three-fiber-game'
import {ACESFilmicToneMapping, AmbientLight, Box3, DirectionalLight, Group, HemisphereLight, PerspectiveCamera, RenderTarget, Scene, SRGBColorSpace, UnsignedByteType, Vector3} from 'three/webgpu'

import {averageLightness, backdropFor, frameObject, gray, snapshotFov, snapshotSize} from './studioSnapshot.ts'

export type StudioSnapshot = {
  /** WebP of the object on a neutral gray */
  image: Blob
  /** the average CIE lightness, 0–1, of the object’s pixels, if any were measured in time */
  lightness?: number
}

type OfflineRenderer = WebgpuRenderer & {
  _animation: {stop: () => void}
  _nodes: {nodeFrame: NodeFrame}
}

const animationKey = '_animation' as const
const nodesKey = '_nodes' as const
/** the direction from the object to the camera: a little to the right of and above the front */
const viewDirection = new Vector3(Math.sin(0.35) * Math.cos(0.28), Math.sin(0.28), Math.cos(0.35) * Math.cos(0.28))
/** the time in ms the lightness scan may take before the backdrop is chosen from what was sampled so far */
const lightnessBudgetMs = 10

/**
 * One detached WebGPU renderer that photographs objects of the scene in a neutral studio: the object alone against a gray that contrasts with its average lightness, lit like the Knot billboards, framed to fill the middle 960 px of a 1024² WebP.
 *
 * The object is cloned, so it keeps its pose in the scene and only its geometries and materials are shared; three keeps per-renderer caches for them, so the gallery’s pipelines are not touched. Snapshots are serialized, as there is one scene and one target.
 */
export default class StudioSnapshotRenderer {
  private readonly camera = new PerspectiveCamera(snapshotFov, 1, 0.01, 100)
  private disposal?: Promise<void>
  private disposed = false
  private readonly errors: Array<string> = []
  private initialization?: Promise<void>
  private readonly renderer = new WebgpuRenderer({
    antialias: true,
    alpha: true,
  })
  private readonly scene = new Scene
  private readonly stage = new Group
  private tail: Promise<void> = Promise.resolve()
  private readonly target = new RenderTarget(snapshotSize, snapshotSize, {
    type: UnsignedByteType,
    samples: 4,
  })

  constructor() {
    this.target.texture.colorSpace = SRGBColorSpace
    this.renderer.setSize(snapshotSize, snapshotSize, false)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.setClearColor(0, 0)
    const key = new DirectionalLight('#fff0d7', 2.3)
    key.position.set(-3, 9, -16)
    this.scene.add(new AmbientLight('#ffffff', 0.45), new HemisphereLight('#e1edff', '#80705d', 1.3), key, this.stage)
  }

  private get device() {
    return (this.renderer.backend as typeof this.renderer.backend & {device: GPUDevice}).device
  }

  dispose() {
    if (!this.disposal) {
      this.disposed = true
      this.disposal = this.release()
    }
  }

  async disposeAsync() {
    this.dispose()
    await this.disposal
  }

  /** Photographs `object` as it is now, keeping its world rotation. Rejects when the renderer is disposed, the object has no visible extent or the GPU reported an error. */
  async snapshot(object: Object3D): Promise<StudioSnapshot> {
    if (this.disposed) {
      throw new Error('The studio snapshot renderer has been disposed.')
    }
    const previous = this.tail
    const gate = Promise.withResolvers<void>()
    this.tail = gate.promise
    await previous
    try {
      return await this.capture(object)
    } finally {
      gate.resolve()
    }
  }

  private async capture(object: Object3D): Promise<StudioSnapshot> {
    await this.init()
    const subject = object.clone(true)
    subject.position.set(0, 0, 0)
    subject.scale.setScalar(1)
    object.getWorldQuaternion(subject.quaternion)
    subject.updateMatrixWorld(true)
    const box = new Box3
    box.setFromObject(subject, true)
    if (box.isEmpty() || !Number.isFinite(box.min.lengthSq() + box.max.lengthSq())) {
      throw new Error(`${object.name || 'The object'} has no visible extent to photograph.`)
    }
    const center = box.getCenter(new Vector3)
    this.camera.position.copy(center).add(viewDirection)
    this.camera.lookAt(center)
    const position = frameObject(subject, this.camera.quaternion)
    if (!position) {
      throw new Error(`${object.name || 'The object'} has no vertices to photograph.`)
    }
    this.camera.position.copy(position)
    const distance = position.distanceTo(center)
    const extent = box.getSize(new Vector3).length()
    this.camera.near = Math.max(0.01, (distance - extent) / 2)
    this.camera.far = distance + extent
    this.camera.updateProjectionMatrix()
    this.stage.add(subject)
    this.errors.length = 0
    this.setTime(0)
    try {
      this.renderer.setOutputRenderTarget(this.target)
      this.renderer.setRenderTarget(this.target)
      await this.renderer.compileAsync(this.scene, this.camera)
      this.renderer.render(this.scene, this.camera)
      const pixels = await this.renderer.readRenderTargetPixelsAsync(this.target, 0, 0, snapshotSize, snapshotSize) as Uint8Array
      await this.device.queue.onSubmittedWorkDone()
      if (this.errors.length) {
        throw new Error(`${object.name || 'The object'}: ${this.errors.join('\n')}`)
      }
      // Rows of 4096 bytes are 256-byte aligned, so WebGPU reads back packed rows in ImageData orientation.
      if (pixels.byteLength !== snapshotSize * snapshotSize * 4) {
        throw new Error(`Unexpected WebGPU readback size: ${pixels.byteLength} bytes.`)
      }
      // A view, not a copy: the readback buffer is ours and never shared.
      const data = new Uint8ClampedArray(pixels.buffer as ArrayBuffer, pixels.byteOffset, pixels.byteLength)
      const lightness = averageLightness(data, snapshotSize, snapshotSize, {budgetMs: lightnessBudgetMs})
      const image = await this.encode(data, backdropFor(lightness))
      return {
        image,
        ...lightness === undefined ? {} : {lightness},
      }
    } finally {
      this.renderer.setOutputRenderTarget(null)
      this.renderer.setRenderTarget(null)
      this.stage.remove(subject)
    }
  }

  private async encode(pixels: Uint8ClampedArray<ArrayBuffer>, backdrop: number) {
    const canvas = new OffscreenCanvas(snapshotSize, snapshotSize)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not create a 2D canvas context for the studio snapshot.')
    }
    const bitmap = await createImageBitmap(new ImageData(pixels, snapshotSize, snapshotSize))
    try {
      context.fillStyle = gray(backdrop)
      context.fillRect(0, 0, snapshotSize, snapshotSize)
      context.drawImage(bitmap, 0, 0)
    } finally {
      bitmap.close()
    }
    const image = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.94,
    })
    if (image.type !== 'image/webp') {
      throw new Error('The browser could not encode the studio snapshot as WebP.')
    }
    return image
  }

  private async init() {
    this.initialization ??= (async () => {
      await this.renderer.init()
      ;(this.renderer as OfflineRenderer)[animationKey].stop()
      this.device.addEventListener('uncapturederror', event => this.errors.push(event.error.message))
    })()
    return this.initialization
  }

  private async release() {
    try {
      await this.tail
      this.target.dispose()
      await this.renderer.dispose()
    } catch (error) {
      console.error('Studio snapshot renderer disposal failed.', error)
    }
  }

  private setTime(seconds: number) {
    const {nodeFrame} = (this.renderer as OfflineRenderer)[nodesKey]
    nodeFrame.frameId++
    nodeFrame.time = seconds
    nodeFrame.deltaTime = 1 / 60
  }
}

/** the one studio of the page, created on the first snapshot and released after a minute without one, as its GPU device is only needed on the occasional throw */
let shared: {
  idle: ReturnType<typeof setTimeout> | undefined
  renderer: StudioSnapshotRenderer
} | undefined
const idleMs = 60_000

export async function snapshotObject(object: Object3D) {
  shared ??= {
    renderer: new StudioSnapshotRenderer,
    idle: undefined,
  }
  const studio = shared
  clearTimeout(studio.idle)
  try {
    return await studio.renderer.snapshot(object)
  } finally {
    studio.idle = setTimeout(() => {
      if (shared === studio) {
        shared = undefined
      }
      studio.renderer.dispose()
    }, idleMs)
  }
}
