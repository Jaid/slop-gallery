import type {KnotEntry} from '../../src/types.ts'
import type {MeshPhysicalNodeMaterial, NodeFrame} from 'three/webgpu'

import {WebgpuRenderer} from 'three-fiber-game'
import {ACESFilmicToneMapping, AmbientLight, DirectionalLight, HalfFloatType, HemisphereLight, Mesh, PerspectiveCamera, RenderTarget, Scene, SRGBColorSpace, UnsignedByteType} from 'three/webgpu'

import {createKnotGeometry} from '../../src/geometry.ts'
import loadKnotMaterial from '../../src/materials.ts'
import StudioEnvironment from '../../src/StudioEnvironment.ts'
import {animationFps, animationFrame, animationSize} from './animation.ts'
import {visibleBounds} from './previewLayout.ts'

export type PreviewCandidate = {
  id: string
  items: ReadonlyArray<KnotEntry>
  symbol: string
}
export type AnimationPreview = {
  dispose: () => void
  renderFrame: (index: number) => Promise<string>
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

/** Detached scene, private frame clock, and explicit GPU readback. Never changes the live game. */
export default class KnotPreviewRenderer {
  private active?: Mesh<typeof this.geometry, MeshPhysicalNodeMaterial>
  private readonly camera = new PerspectiveCamera(50, 1, 0.05, 100)
  private readonly environment = new StudioEnvironment
  private readonly errors: Array<string> = []
  private readonly geometry = createKnotGeometry()
  private readonly iconTarget = new RenderTarget(animationSize, animationSize, {
    type: UnsignedByteType,
    samples: 4,
  })
  private readonly renderer = new WebgpuRenderer({
    antialias: true,
    alpha: true,
  })
  private readonly scene = new Scene
  private readonly validationTarget = new RenderTarget(32, 32, {type: HalfFloatType})

  constructor() {
    this.iconTarget.texture.colorSpace = SRGBColorSpace
    this.renderer.setSize(animationSize, animationSize, false)
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
        return png((await this.capture(item.id, frame.time)).image)
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

  private async capture(id: string, seconds = 0) {
    this.setTime(seconds)
    try {
      this.renderer.setRenderTarget(this.validationTarget)
      this.renderer.render(this.scene, this.camera)
      const hdr = await this.renderer.readRenderTargetPixelsAsync(this.validationTarget, 0, 0, 32, 32) as Uint16Array
      if (hdr.some(value => (value & 0x7C_00) === 0x7C_00)) {
        throw new Error(`${id} produced non-finite HDR pixels.`)
      }
      this.renderer.setOutputRenderTarget(this.iconTarget)
      this.renderer.setRenderTarget(this.iconTarget)
      this.renderer.render(this.scene, this.camera)
      const pixels = await this.renderer.readRenderTargetPixelsAsync(this.iconTarget, 0, 0, animationSize, animationSize) as Uint8Array
      await this.device.queue.onSubmittedWorkDone()
      if (this.errors.length) {
        throw new Error(`${id}: ${this.errors.join('\n')}`)
      }
      const output = new Uint8ClampedArray(pixels.length)
      const stride = animationSize * 4
      for (let y = 0; y < animationSize; y++) {
        output.set(pixels.subarray(y * stride, (y + 1) * stride), (animationSize - 1 - y) * stride)
      }
      const data = new ImageData(output, animationSize, animationSize)
      const bounds = visibleBounds(data)
      if (!bounds) {
        throw new Error(`${id} produced an empty preview.`)
      }
      const image = canvas(animationSize)
      image.getContext('2d')!.putImageData(data, 0, 0)
      return {
        image,
        bounds,
      }
    } finally {
      this.renderer.setOutputRenderTarget(null)
      this.renderer.setRenderTarget(null)
    }
  }

  private positionCamera(distance: number) {
    this.camera.position.set(Math.sin(0.18) * distance, 0, Math.cos(0.18) * distance)
    this.camera.lookAt(0, 0, 0)
  }

  private async prepare(item: KnotEntry, rotating = false) {
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
      this.renderer.setOutputRenderTarget(this.iconTarget)
      this.renderer.setRenderTarget(this.iconTarget)
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
