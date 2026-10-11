import type {Camera, Renderer, Scene} from 'three/webgpu'

import {abs, color, mix, normalView} from 'three/tsl'
import {Color, DoubleSide, MeshBasicNodeMaterial, RenderPipeline} from 'three/webgpu'

/** Hidden-line wireframe for eyeballing polygon density. A depth-writing fill pass occludes the edges of the following line pass, so only the triangles of visible surfaces show. Both overrides inherit each material’s `positionNode`, so displaced surfaces keep their real shape. */
export default class WireframeRenderPipeline extends RenderPipeline {
  private readonly background = new Color('#05070a')
  private readonly camera: Camera
  // Pushed back slightly so coplanar lines of the visible surface win the depth test.
  private readonly fill = new MeshBasicNodeMaterial({
    colorNode: mix(color('#0b0f14'), color('#1f2833'), abs(normalView.z)),
    fog: false,
    forceSinglePass: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: DoubleSide,
  })
  private readonly lines = new MeshBasicNodeMaterial({
    colorNode: color('#5ef2c8'),
    depthWrite: false,
    fog: false,
    forceSinglePass: true,
    side: DoubleSide,
    wireframe: true,
  })
  private readonly scene: Scene

  constructor(renderer: Renderer, scene: Scene, camera: Camera) {
    super(renderer)
    this.scene = scene
    this.camera = camera
    this.fill.name = 'WireframeVision.fill'
    this.lines.name = 'WireframeVision.lines'
  }

  override dispose() {
    super.dispose()
    this.fill.dispose()
    this.lines.dispose()
  }

  override render() {
    const {camera, renderer, scene} = this
    const {autoClear} = renderer
    const {background, overrideMaterial} = scene
    try {
      scene.background = this.background
      scene.overrideMaterial = this.fill
      renderer.render(scene, camera)
      // A null background keeps the second pass from clearing or painting a skybox over the fill.
      scene.background = null
      scene.overrideMaterial = this.lines
      renderer.autoClear = false
      renderer.render(scene, camera)
    } finally {
      renderer.autoClear = autoClear
      scene.background = background
      scene.overrideMaterial = overrideMaterial
    }
  }
}
