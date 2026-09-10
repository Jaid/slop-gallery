import type {KnotEntry} from '../../../src/lib/knots/types.ts'

import {ACESFilmicToneMapping, AmbientLight, DirectionalLight, HalfFloatType, HemisphereLight, Mesh, PerspectiveCamera, RenderTarget, Scene} from 'three/webgpu'

import {WebgpuRenderer} from '../../../packages/three-fiber-game/src/WebgpuRenderer.ts'
import {createKnotGeometry} from '../../../src/lib/gallery/sculptures.ts'
import {loadKnotMaterial} from '../../../src/lib/knots/materials.ts'
import {StudioEnvironment} from '../../../src/lib/materials/StudioEnvironment.ts'
import {previewTileRect, visibleBounds} from './previewLayout.ts'

export type PreviewCandidate = {
  id: string
  items: ReadonlyArray<KnotEntry>
  selected: ReadonlyArray<number>
  symbol: string
  title: string
}

const iconSize = 640
const tileSize = 320
const tileHeight = 366
const columns = 4
const canvas = (width: number, height = width) => Object.assign(document.createElement('canvas'), {
  width,
  height,
})
// Lossless transport to Bun; updateKnots encodes JXL masters before publishing.
const png = (image: HTMLCanvasElement) => image.toDataURL('image/png').split(',')[1]

/** Owns a detached WebGPU scene. Never reads or changes the live game or its input. */
export class KnotPreviewRenderer {
  private readonly camera = new PerspectiveCamera(50, 1, 0.05, 100)
  private readonly environment = new StudioEnvironment
  private readonly errors: Array<string> = []
  private readonly geometry = createKnotGeometry()
  private readonly renderer = new WebgpuRenderer({
    antialias: true,
    alpha: true,
  })
  private readonly scene = new Scene
  private readonly target = new RenderTarget(32, 32, {type: HalfFloatType})

  constructor() {
    this.renderer.setSize(iconSize, iconSize, false)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.setClearColor(0, 0)
    const key = new DirectionalLight('#fff0d7', 2.3)
    key.position.set(-3, 9, -16)
    this.scene.add(new AmbientLight('#ffffff', 0.45), new HemisphereLight('#e1edff', '#80705d', 1.3), key)
    this.camera.position.set(Math.sin(0.18) * 2.1, 0, Math.cos(0.18) * 2.1)
    this.camera.lookAt(0, 0, 0)
  }

  private get device() {
    // Three r186 exposes the device, but the r185 type declarations omit it.
    return (this.renderer.backend as typeof this.renderer.backend & {device: GPUDevice}).device
  }

  dispose() {
    this.target.dispose()
    this.geometry.dispose()
    this.environment.dispose()
    this.renderer.dispose()
  }

  async init() {
    await this.renderer.init()
    this.device.addEventListener('uncapturederror', event => this.errors.push(event.error.message))
  }

  async renderCandidate(candidate: PreviewCandidate) {
    const overview = canvas(columns * tileSize, Math.max(2, Math.ceil(candidate.selected.length / columns)) * tileHeight)
    const context = overview.getContext('2d')!
    context.fillStyle = '#17202b'
    context.fillRect(0, 0, overview.width, overview.height)
    context.textAlign = 'center'
    const items: Array<{id: string
      image: string}> = []
    for (const item of candidate.items) {
      const image = await this.renderItem(item)
      items.push({
        id: item.sourceId,
        image: png(image),
      })
      const index = candidate.selected.indexOf(item.number)
      if (index === -1) {
        continue
      }
      const x = index % columns * tileSize
      const y = Math.floor(index / columns) * tileHeight
      const [left, top, width, height] = previewTileRect(image.width, image.height, tileSize)
      context.drawImage(image, x + left, y + top, width, height)
      context.fillStyle = item.accent
      context.font = '19px sans-serif'
      context.fillText(`#${String(item.number).padStart(2, '0')} · ${item.title}`, x + tileSize / 2, y + tileSize + 29, tileSize - 12)
    }
    if (!candidate.selected.length) {
      context.fillStyle = '#8696a5'
      context.font = '28px sans-serif'
      context.fillText(`${candidate.title} · No displayed Knots`, overview.width / 2, overview.height / 2)
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
      overview: png(overview),
      icon: png(icon),
    }
  }

  private async renderItem(item: KnotEntry) {
    const Material = await loadKnotMaterial(item)
    const material = new Material(this.environment)
    const mesh = new Mesh(this.geometry, material)
    // Displaced vertices can extend beyond the undisplaced geometry’s bounds.
    mesh.frustumCulled = false
    this.scene.add(mesh)
    try {
      this.renderer.render(this.scene, this.camera)
      const image = canvas(iconSize)
      image.getContext('2d')!.drawImage(this.renderer.domElement, 0, 0)
      this.renderer.setRenderTarget(this.target)
      this.renderer.render(this.scene, this.camera)
      const pixels = await this.renderer.readRenderTargetPixelsAsync(this.target, 0, 0, 32, 32) as Uint16Array
      if (pixels.some(value => (value & 0x7C_00) === 0x7C_00)) {
        throw new Error(`${item.id} produced non-finite HDR pixels.`)
      }
      await this.device.queue.onSubmittedWorkDone()
      if (this.errors.length) {
        throw new Error(`${item.id}: ${this.errors.join('\n')}`)
      }
      const bounds = visibleBounds(image.getContext('2d')!.getImageData(0, 0, image.width, image.height))
      if (!bounds) {
        throw new Error(`${item.id} produced an empty preview.`)
      }
      const cropped = canvas(bounds[2], bounds[3])
      cropped.getContext('2d')!.drawImage(image, ...bounds, 0, 0, cropped.width, cropped.height)
      return cropped
    } finally {
      this.renderer.setRenderTarget(null)
      this.scene.remove(mesh)
      material.dispose()
    }
  }
}
