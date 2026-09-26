import type {KnotEntry} from '../../src/types.ts'
import type {RenderFrame} from './renderSettings.ts'
import type {MeshPhysicalNodeMaterial, NodeFrame} from 'three/webgpu'

import {WebgpuRenderer} from 'three-fiber-game'
import {ACESFilmicToneMapping, AmbientLight, DirectionalLight, HalfFloatType, HemisphereLight, Mesh, PerspectiveCamera, RenderTarget, Scene, SRGBColorSpace, UnsignedByteType} from 'three/webgpu'

import {createKnotGeometry} from '../../src/geometry.ts'
import loadKnotMaterial from '../../src/materials.ts'
import StudioEnvironment from '../../src/StudioEnvironment.ts'
import {animationFps, closeupSize, inspectionAnimationSize, inspectionVideoRenderSize, inspectionVideoSize, previewBaseFov, previewFovForDistanceScale, previewSupersampling, stillSize} from './renderSettings.ts'

export type KnotPreview = {
  dispose: () => void
  renderFrame: (frame: RenderFrame) => Promise<string>
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
const squareSize = (size: number) => [size, size] as const

/** Detached scene, private frame clock, and explicit GPU readback. Never changes the live game. */
export default class KnotPreviewRenderer {
  private active?: Mesh<typeof this.geometry, MeshPhysicalNodeMaterial>
  private readonly animationTarget = new RenderTarget(renderSize(inspectionAnimationSize), renderSize(inspectionAnimationSize), {
    type: UnsignedByteType,
    samples: 4,
  })
  private readonly camera = new PerspectiveCamera(previewBaseFov, 1, 0.05, 100)
  private readonly closeupTarget = new RenderTarget(closeupSize[0], closeupSize[1], {
    type: UnsignedByteType,
    samples: 4,
  })
  private readonly environment = new StudioEnvironment
  private readonly errors: Array<string> = []
  private readonly geometry = createKnotGeometry()
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
  private readonly videoTarget = new RenderTarget(inspectionVideoRenderSize, inspectionVideoRenderSize, {
    type: UnsignedByteType,
    samples: 4,
  })

  constructor() {
    this.animationTarget.texture.colorSpace = SRGBColorSpace
    this.closeupTarget.texture.colorSpace = SRGBColorSpace
    this.stillTarget.texture.colorSpace = SRGBColorSpace
    this.videoTarget.texture.colorSpace = SRGBColorSpace
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

  async createPreview(item: KnotEntry): Promise<KnotPreview> {
    await this.prepare(item)
    const mesh = this.active!
    const baseDistance = this.camera.position.length()
    const render = async (frame: RenderFrame) => {
      if (this.active !== mesh) {
        throw new Error('The knot preview has been disposed.')
      }
      mesh.rotation.y = 0
      let target = this.animationTarget
      let size: readonly [number, number] = squareSize(inspectionAnimationSize)
      if (frame.size === 'closeup') {
        target = this.closeupTarget
        size = closeupSize
      } else if (frame.size === 'still') {
        target = this.stillTarget
        size = squareSize(stillSize)
      } else if (frame.size === 'video') {
        target = this.videoTarget
        size = squareSize(inspectionVideoSize)
      }
      this.camera.aspect = size[0] / size[1]
      this.positionCamera(baseDistance * frame.distanceScale, 0.18 + frame.angle, frame.distanceScale, frame.fov, frame.elevation)
      return this.capture(item.id, target, size, frame.seconds)
    }
    return {
      renderFrame: async frame => png(await render(frame)),
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
    this.videoTarget.dispose()
    this.stillTarget.dispose()
    this.closeupTarget.dispose()
    this.animationTarget.dispose()
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

  private async capture(id: string, target: RenderTarget, size: readonly [number, number], seconds = 0) {
    this.setTime(seconds)
    const [width, height] = size
    const sourceWidth = target.width
    const sourceHeight = target.height
    this.renderer.setSize(sourceWidth, sourceHeight, false)
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
      const pixels = await this.renderer.readRenderTargetPixelsAsync(target, 0, 0, sourceWidth, sourceHeight) as Uint8Array
      await this.device.queue.onSubmittedWorkDone()
      if (this.errors.length) {
        throw new Error(`${id}: ${this.errors.join('\n')}`)
      }
      const output = new Uint8ClampedArray(pixels.length)
      const stride = sourceWidth * 4
      for (let y = 0; y < sourceHeight; y++) {
        output.set(pixels.subarray(y * stride, (y + 1) * stride), (sourceHeight - 1 - y) * stride)
      }
      let visible = false
      for (let index = 3; index < output.length; index += 4) {
        if (output[index] !== 0) {
          visible = true
          break
        }
      }
      if (!visible) {
        throw new Error(`${id} produced an empty preview.`)
      }
      const source = canvas(sourceWidth, sourceHeight)
      source.getContext('2d')!.putImageData(new ImageData(output, sourceWidth, sourceHeight), 0, 0)
      const image = canvas(width, height)
      const context = image.getContext('2d')!
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(source, 0, 0, width, height)
      return image
    } finally {
      this.renderer.setOutputRenderTarget(null)
      this.renderer.setRenderTarget(null)
    }
  }

  private positionCamera(distance: number, angle = 0.18, distanceScale = 1, fov = previewFovForDistanceScale(distanceScale), elevation = 0) {
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
    const horizontalDistance = Math.cos(elevation) * distance
    this.camera.position.set(Math.sin(angle) * horizontalDistance, Math.sin(elevation) * distance, Math.cos(angle) * horizontalDistance)
    this.camera.lookAt(0, 0, 0)
  }

  private async prepare(item: KnotEntry) {
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
    this.positionCamera(Math.max(2.1, radius / Math.sin(this.camera.fov * Math.PI / 360) * 1.08))
    try {
      // Compile both real offscreen contexts, rather than compiling against an unused canvas.
      this.renderer.setOutputRenderTarget(this.stillTarget)
      this.renderer.setRenderTarget(this.stillTarget)
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
