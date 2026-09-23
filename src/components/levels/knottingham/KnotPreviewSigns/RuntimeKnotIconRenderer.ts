import type {KnotEntry, KnotMaterialConstructor} from 'knot-materials/types.ts'
import type {NodeFrame} from 'three/webgpu'

import createPlaceholderMaterial from 'knot-materials/createPlaceholderMaterial.ts'
import {createKnotGeometry} from 'knot-materials/geometry.ts'
import StudioEnvironment from 'knot-materials/StudioEnvironment.ts'
import {WebgpuRenderer} from 'three-fiber-game'
import {ACESFilmicToneMapping, AmbientLight, DirectionalLight, HalfFloatType, HemisphereLight, Mesh, PerspectiveCamera, RenderTarget, Scene, SRGBColorSpace, UnsignedByteType} from 'three/webgpu'

type OfflineRenderer = WebgpuRenderer & {
  _animation: {stop: () => void}
  _nodes: {nodeFrame: NodeFrame}
}

const iconSize = 640
const supersampling = 2
const renderSize = iconSize * supersampling
const previewFov = 50
const animationKey = '_animation' as const
const nodesKey = '_nodes' as const
const canvas = (width: number, height = width) => Object.assign(document.createElement('canvas'), {
  width,
  height,
})
function visibleBounds({data, width, height}: Pick<ImageData, 'data' | 'height' | 'width'>) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) {
        continue
      }
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  return right < left ? undefined : [left, top, right - left + 1, bottom - top + 1] as const
}
function releaseCanvases(images: ReadonlyMap<string, HTMLCanvasElement>) {
  for (const image of images.values()) {
    image.width = 0
    image.height = 0
  }
}

/** One detached WebGPU renderer serializes runtime knot screenshots for every billboard. */
export default class RuntimeKnotIconRenderer {
  private active?: Mesh
  private readonly camera = new PerspectiveCamera(previewFov, 1, 0.05, 100)
  private disposal?: Promise<void>
  private disposed = false
  private readonly environment?: StudioEnvironment
  private readonly errors: Array<string> = []
  private readonly geometry = createKnotGeometry()
  private initialization?: Promise<void>
  private readonly renderer = new WebgpuRenderer({
    antialias: true,
    alpha: true,
  })
  private readonly scene = new Scene
  private tail: Promise<void> = Promise.resolve()
  private readonly target = new RenderTarget(renderSize, renderSize, {
    type: UnsignedByteType,
    samples: 4,
  })
  private readonly validationTarget = new RenderTarget(32, 32, {type: HalfFloatType})

  constructor(
    private readonly constructors: ReadonlyMap<string, KnotMaterialConstructor>,
    private readonly quality: boolean,
  ) {
    this.environment = quality ? new StudioEnvironment : undefined
    this.target.texture.colorSpace = SRGBColorSpace
    this.renderer.setSize(renderSize, renderSize, false)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.setClearColor(0, 0)
    const key = new DirectionalLight('#fff0d7', 2.3)
    key.position.set(-3, 9, -16)
    this.scene.add(new AmbientLight('#ffffff', 0.45), new HemisphereLight('#e1edff', '#80705d', 1.3), key)
    this.camera.position.set(Math.sin(0.18) * 2.1, 0, Math.cos(0.18) * 2.1)
    this.camera.lookAt(0, 0, 0)
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

  async render(entries: ReadonlyArray<KnotEntry>, signal: AbortSignal) {
    if (this.disposed) {
      throw new Error('Runtime knot icon renderer has been disposed.')
    }
    const previous = this.tail
    const gate = Promise.withResolvers<void>()
    this.tail = gate.promise
    await previous
    try {
      return await this.renderBatch(entries, signal)
    } finally {
      gate.resolve()
    }
  }

  private async capture(id: string) {
    this.setTime(0)
    try {
      this.renderer.setRenderTarget(this.validationTarget)
      this.renderer.render(this.scene, this.camera)
      const hdr = await this.renderer.readRenderTargetPixelsAsync(this.validationTarget, 0, 0, 32, 32) as Uint16Array
      if (hdr.some(value => (value & 0x7C_00) === 0x7C_00)) {
        throw new Error(`${id} produced non-finite HDR pixels.`)
      }
      this.renderer.setOutputRenderTarget(this.target)
      this.renderer.setRenderTarget(this.target)
      this.renderer.render(this.scene, this.camera)
      const pixels = await this.renderer.readRenderTargetPixelsAsync(this.target, 0, 0, renderSize, renderSize) as Uint8Array
      await this.device.queue.onSubmittedWorkDone()
      if (this.errors.length) {
        throw new Error(`${id}: ${this.errors.join('\n')}`)
      }
      const output = new Uint8ClampedArray(pixels.length)
      const stride = renderSize * 4
      for (let y = 0; y < renderSize; y++) {
        output.set(pixels.subarray(y * stride, (y + 1) * stride), (renderSize - 1 - y) * stride)
      }
      const data = new ImageData(output, renderSize, renderSize)
      const bounds = visibleBounds(data)
      if (!bounds) {
        throw new Error(`${id} produced an empty preview.`)
      }
      const source = canvas(renderSize)
      source.getContext('2d')!.putImageData(data, 0, 0)
      const downsampled = canvas(iconSize)
      const context = downsampled.getContext('2d')!
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(source, 0, 0, iconSize, iconSize)
      source.width = 0
      source.height = 0
      const scale = iconSize / renderSize
      const left = Math.floor(bounds[0] * scale)
      const top = Math.floor(bounds[1] * scale)
      const right = Math.ceil((bounds[0] + bounds[2]) * scale)
      const bottom = Math.ceil((bounds[1] + bounds[3]) * scale)
      const cropped = canvas(right - left, bottom - top)
      cropped.getContext('2d')!.drawImage(downsampled, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
      downsampled.width = 0
      downsampled.height = 0
      return cropped
    } finally {
      this.renderer.setOutputRenderTarget(null)
      this.renderer.setRenderTarget(null)
    }
  }

  private async init() {
    if (this.initialization) {
      return this.initialization
    }
    this.initialization = (async () => {
      await this.renderer.init()
      ;(this.renderer as OfflineRenderer)[animationKey].stop()
      this.device.addEventListener('uncapturederror', event => this.errors.push(event.error.message))
    })()
    return this.initialization
  }

  private async prepare(item: KnotEntry) {
    if (this.active) {
      throw new Error('A runtime knot icon material is already active.')
    }
    let material
    if (this.quality) {
      const Material = this.constructors.get(item.id)
      if (!Material) {
        throw new Error(`Missing material constructor for ${item.id}.`)
      }
      material = new Material(this.environment!)
    } else {
      material = createPlaceholderMaterial(item.placeholder, false)
    }
    this.active = new Mesh(this.geometry, material)
    this.active.frustumCulled = false
    this.scene.add(this.active)
    this.errors.length = 0
    try {
      this.renderer.setOutputRenderTarget(this.target)
      this.renderer.setRenderTarget(this.target)
      await this.renderer.compileAsync(this.scene, this.camera)
      this.renderer.setOutputRenderTarget(null)
      this.renderer.setRenderTarget(this.validationTarget)
      await this.renderer.compileAsync(this.scene, this.camera)
    } catch (error) {
      this.releaseMaterial()
      throw error
    } finally {
      this.renderer.setOutputRenderTarget(null)
      this.renderer.setRenderTarget(null)
    }
  }

  private async release() {
    try {
      await this.tail
      this.releaseMaterial()
      this.validationTarget.dispose()
      this.target.dispose()
      this.geometry.dispose()
      this.environment?.dispose()
      await this.renderer.dispose()
    } catch (error) {
      console.error('Runtime knot icon renderer disposal failed.', error)
    }
  }

  private releaseMaterial() {
    if (!this.active) {
      return
    }
    this.scene.remove(this.active)
    const material = this.active.material
    if (Array.isArray(material)) {
      for (const entry of material) {
        entry.dispose()
      }
    } else {
      material.dispose()
    }
    this.active = undefined
  }

  private async renderBatch(entries: ReadonlyArray<KnotEntry>, signal: AbortSignal) {
    signal.throwIfAborted()
    await this.init()
    const images = new Map<string, HTMLCanvasElement>
    try {
      for (const entry of entries) {
        signal.throwIfAborted()
        await this.prepare(entry)
        try {
          images.set(entry.id, await this.capture(entry.id))
        } finally {
          this.releaseMaterial()
        }
      }
      signal.throwIfAborted()
      return images
    } catch (error) {
      releaseCanvases(images)
      throw error
    }
  }

  private setTime(seconds: number) {
    const {nodeFrame} = (this.renderer as OfflineRenderer)[nodesKey]
    nodeFrame.frameId++
    nodeFrame.time = seconds
    nodeFrame.deltaTime = 1 / 60
  }
}

export {releaseCanvases}
