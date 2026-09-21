import type {KnotEntry} from '../../src/types.ts'
import type {RenderFrame} from './renderSettings.ts'
import type {MeshPhysicalNodeMaterial, NodeFrame} from 'three/webgpu'

import {WebgpuRenderer} from 'three-fiber-game'
import {ACESFilmicToneMapping, AmbientLight, DirectionalLight, HalfFloatType, HemisphereLight, Mesh, PerspectiveCamera, RenderTarget, Scene, SRGBColorSpace, UnsignedByteType} from 'three/webgpu'

import {createKnotGeometry} from '../../src/geometry.ts'
import loadKnotMaterial from '../../src/materials.ts'
import StudioEnvironment from '../../src/StudioEnvironment.ts'
import {animationFps, animationFrame, animationSize} from './animation.ts'
import {visibleBounds} from './previewLayout.ts'
import {previewBaseFov, previewFovForDistanceScale, previewSupersampling, stillSize} from './renderSettings.ts'

export type PreviewCandidate = {
  id: string
  items: ReadonlyArray<KnotEntry>
  symbol: string
}
export type AnimationPreview = {
  dispose: () => void
  renderFrame: (index: number) => Promise<string>
}
export type KnotPreview = {
  dispose: () => void
  renderFrame: (frame: RenderFrame) => Promise<string>
  renderSet: (frames: ReadonlyArray<RenderFrame>) => Promise<{
    images: Array<string>
    sheet: string
  }>
}

type OfflineRenderer = WebgpuRenderer & {
  _animation: {stop: () => void}
  _nodes: {nodeFrame: NodeFrame}
}

const canvas = (width: number, height = width) => Object.assign(document.createElement('canvas'), {
  width,
  height,
})
const png = (image: HTMLCanvasElement) => image.toDataURL('image/png').split(',')[1]
const renderSize = (size: number) => Math.round(size * previewSupersampling)

/** Detached scene, private frame clock, and explicit GPU readback. Never changes the live game. */
export default class KnotPreviewRenderer {
  private active?: Mesh<typeof this.geometry, MeshPhysicalNodeMaterial>
  private readonly camera = new PerspectiveCamera(previewBaseFov, 1, 0.05, 100)
  private readonly environment = new StudioEnvironment
  private readonly errors: Array<string> = []
  private readonly geometry = createKnotGeometry()
  private readonly iconTarget = new RenderTarget(renderSize(animationSize), renderSize(animationSize), {
    type: UnsignedByteType,
    samples: 4,
  })
  private readonly renderer = new WebgpuRenderer({
    antialias: true,
    alpha: true,
  })
  private readonly scene = new Scene
  private readonly stillTarget = new RenderTarget(renderSize(stillSize), renderSize(stillSize), {
    type: UnsignedByteType,
    samples: 4,
  })
  private readonly validationTarget = new RenderTarget(32, 32, {type: HalfFloatType})

  constructor() {
    this.iconTarget.texture.colorSpace = SRGBColorSpace
    this.stillTarget.texture.colorSpace = SRGBColorSpace
    this.renderer.setSize(renderSize(animationSize), renderSize(animationSize), false)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.setClearColor(0, 0)
    const key = new DirectionalLight('#fff0d7', 2.3)
    key.position.set(-3, 9, -16)
    this.scene.add(new AmbientLight('#ffffff', 0.45), new HemisphereLight('#e1edff', '#80705d', 1.3), key)
    this.positionCamera(2.1)
  }

  private get device() {
    return (this.renderer.backend as typeof this.renderer.backend & {device: GPUDevice}).device
  }

  async createAnimation(item: KnotEntry): Promise<AnimationPreview> {
    await this.prepare(item, true)
    const mesh = this.active!
    return {
      renderFrame: async index => {
        if (this.active !== mesh) {
          throw new Error('The animation preview has been disposed.')
        }
        const frame = animationFrame(index)
        mesh.rotation.y = frame.rotation
        // Keep one fixed canvas and camera for the whole turn: per-frame cropping would wobble.
        return png((await this.capture(item.id, this.iconTarget, animationSize, frame.time)).image)
      },
      dispose: () => {
        if (this.active === mesh) {
          this.releaseMaterial()
        }
      },
    }
  }

  async createPreview(item: KnotEntry): Promise<KnotPreview> {
    await this.prepare(item, true, this.stillTarget)
    const mesh = this.active!
    const baseDistance = this.camera.position.length()
    const render = async (frame: RenderFrame) => {
      if (this.active !== mesh) {
        throw new Error('The knot preview has been disposed.')
      }
      mesh.rotation.y = 0
      this.positionCamera(baseDistance * frame.distanceScale, 0.18 + frame.angle, frame.distanceScale)
      const target = frame.size === 'still' ? this.stillTarget : this.iconTarget
      const size = frame.size === 'still' ? stillSize : animationSize
      return (await this.capture(item.id, target, size, frame.seconds)).image
    }
    return {
      renderFrame: async frame => png(await render(frame)),
      renderSet: async frames => {
        if (!frames.length || frames.some(frame => frame.size !== 'still')) {
          throw new Error('Preview sheets require at least one still frame.')
        }
        const images: Array<string> = []
        const cellSize = stillSize / 2
        const columns = Math.min(2, frames.length)
        const rows = Math.ceil(frames.length / columns)
        const sheet = canvas(columns * cellSize, rows * cellSize)
        const context = sheet.getContext('2d')!
        for (const [index, frame] of frames.entries()) {
          const image = await render(frame)
          images.push(png(image))
          context.drawImage(image, index % columns * cellSize, Math.floor(index / columns) * cellSize, cellSize, cellSize)
        }
        return {
          images,
          sheet: png(sheet),
        }
      },
      dispose: () => {
        if (this.active === mesh) {
          this.releaseMaterial()
        }
      },
    }
  }

  async dispose() {
    this.releaseMaterial()
    this.validationTarget.dispose()
    this.stillTarget.dispose()
    this.iconTarget.dispose()
    this.geometry.dispose()
    this.environment.dispose()
    await this.renderer.dispose()
  }

  async init() {
    await this.renderer.init()
    // Offline sampling must not follow wall-clock latency or a requestAnimationFrame loop.
    // These internals are isolated to this owned renderer; never replace global TSL time nodes.
    ;(this.renderer as OfflineRenderer)._animation.stop()
    this.device.addEventListener('uncapturederror', event => this.errors.push(event.error.message))
  }

  async renderCandidate(candidate: PreviewCandidate) {
    const items: Array<{
      id: string
      image: string
    }> = []
    for (const item of candidate.items) {
      items.push({
        id: item.id,
        image: await this.renderIcon(item),
      })
    }
    const symbol = new Image
    symbol.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(candidate.symbol)}`
    await symbol.decode()
    const icon = canvas(256)
    const scale = Math.min(icon.width / symbol.naturalWidth, icon.height / symbol.naturalHeight)
    const width = symbol.naturalWidth * scale
    const height = symbol.naturalHeight * scale
    icon.getContext('2d')!.drawImage(symbol, (icon.width - width) / 2, (icon.height - height) / 2, width, height)
    return {
      items,
      icon: png(icon),
    }
  }

  async renderIcon(item: KnotEntry) {
    await this.prepare(item)
    try {
      const {image, bounds} = await this.capture(item.id)
      const cropped = canvas(bounds[2], bounds[3])
      cropped.getContext('2d')!.drawImage(image, ...bounds, 0, 0, cropped.width, cropped.height)
      return png(cropped)
    } finally {
      this.releaseMaterial()
    }
  }

  private async capture(id: string, target = this.iconTarget, size = animationSize, seconds = 0) {
    this.setTime(seconds)
    const sourceSize = renderSize(size)
    this.renderer.setSize(sourceSize, sourceSize, false)
    try {
      this.renderer.setRenderTarget(this.validationTarget)
      this.renderer.render(this.scene, this.camera)
      const hdr = await this.renderer.readRenderTargetPixelsAsync(this.validationTarget, 0, 0, 32, 32) as Uint16Array
      if (hdr.some(value => (value & 0x7C_00) === 0x7C_00)) {
        throw new Error(`${id} produced non-finite HDR pixels.`)
      }
      this.renderer.setOutputRenderTarget(target)
      this.renderer.setRenderTarget(target)
      this.renderer.render(this.scene, this.camera)
      const pixels = await this.renderer.readRenderTargetPixelsAsync(target, 0, 0, sourceSize, sourceSize) as Uint8Array
      await this.device.queue.onSubmittedWorkDone()
      if (this.errors.length) {
        throw new Error(`${id}: ${this.errors.join('\n')}`)
      }
      const output = new Uint8ClampedArray(pixels.length)
      const stride = sourceSize * 4
      for (let y = 0; y < sourceSize; y++) {
        output.set(pixels.subarray(y * stride, (y + 1) * stride), (sourceSize - 1 - y) * stride)
      }
      const data = new ImageData(output, sourceSize, sourceSize)
      const sourceBounds = visibleBounds(data)
      if (!sourceBounds) {
        throw new Error(`${id} produced an empty preview.`)
      }
      const source = canvas(sourceSize)
      source.getContext('2d')!.putImageData(data, 0, 0)
      const image = canvas(size)
      const context = image.getContext('2d')!
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(source, 0, 0, size, size)
      const scale = size / sourceSize
      const left = Math.floor(sourceBounds[0] * scale)
      const top = Math.floor(sourceBounds[1] * scale)
      const right = Math.ceil((sourceBounds[0] + sourceBounds[2]) * scale)
      const bottom = Math.ceil((sourceBounds[1] + sourceBounds[3]) * scale)
      return {
        image,
        bounds: [left, top, right - left, bottom - top] as const,
      }
    } finally {
      this.renderer.setOutputRenderTarget(null)
      this.renderer.setRenderTarget(null)
    }
  }

  private positionCamera(distance: number, angle = 0.18, distanceScale = 1) {
    this.camera.fov = previewFovForDistanceScale(distanceScale)
    this.camera.updateProjectionMatrix()
    this.camera.position.set(Math.sin(angle) * distance, 0, Math.cos(angle) * distance)
    this.camera.lookAt(0, 0, 0)
  }

  private async prepare(item: KnotEntry, rotating = false, target = this.iconTarget) {
    if (this.active) {
      throw new Error('A preview material is already active.')
    }
    const Material = await loadKnotMaterial(item)
    this.active = new Mesh(this.geometry, new Material(this.environment))
    this.active.frustumCulled = false
    this.scene.add(this.active)
    this.errors.length = 0
    this.geometry.computeBoundingSphere()
    const sphere = this.geometry.boundingSphere!
    const radius = sphere.radius + sphere.center.length() + (item.displacement ?? 0)
    this.positionCamera(rotating ? Math.max(2.1, radius / Math.sin(this.camera.fov * Math.PI / 360) * 1.08) : 2.1)
    try {
      // Compile both real offscreen contexts, rather than compiling against an unused canvas.
      this.renderer.setOutputRenderTarget(target)
      this.renderer.setRenderTarget(target)
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

  private releaseMaterial() {
    if (!this.active) {
      return
    }
    this.scene.remove(this.active)
    this.active.material.dispose()
    this.active = undefined
  }

  private setTime(seconds: number) {
    const {nodeFrame} = (this.renderer as OfflineRenderer)._nodes
    nodeFrame.frameId++
    nodeFrame.time = seconds
    nodeFrame.deltaTime = 1 / animationFps
  }
}
