import type {Camera, Material, Node, NodeBuilder, Object3D, Renderer} from 'three/webgpu'

import {context, diffuseColor, emissive, output, pass, premultiplyAlpha, renderOutput, vec4} from 'three/tsl'
import {NoToneMapping, RenderPipeline} from 'three/webgpu'

/** A material whose emission is the view through it rather than light of its own, like glass that refracts its backdrop itself. {@link AlbedoRenderPipeline} keeps that view and drops every other emission. */
export type TransmittingEmission = {readonly emissionIsTransmission: true}

const transmitsEmission = (material: Material) => (material as Material & Partial<TransmittingEmission>).emissionIsTransmission === true

/**
 * Every surface in its own color, as if evenly lit from all sides at full strength: each material outputs its diffuse color (base color, map, vertex and instance colors and opacity) instead of what its lighting shades it to, so lights, shadows, the environment, emission and fog leave no trace.
 * Nothing tone maps, exposes or postprocesses the result; it only converts to the output color space. Four samples per pixel smooth geometric edges without touching the colors inside surfaces.
 */
export default class AlbedoRenderPipeline extends RenderPipeline {
  readonly scenePass: ReturnType<typeof pass>

  constructor(renderer: Renderer, scene: Object3D, camera: Camera) {
    super(renderer)
    this.scenePass = pass(scene, camera, {samples: 4})
    this.scenePass.contextNode = context({
      getOutput: (_lit: unknown, builder: NodeBuilder) => {
        const {material} = builder
        // Glass of this kind is opaque and brings what is behind it in through its emission, which here samples the albedo behind it.
        let albedo: Node<'vec4'> = transmitsEmission(material) ? vec4(diffuseColor.rgb.add(emissive), diffuseColor.a) : diffuseColor
        if (material.premultipliedAlpha) {
          albedo = premultiplyAlpha(albedo)
        }
        // A material’s own MRT outputs, like the fountain spray’s, read the output property rather than the result.
        output.assign(albedo)
        return albedo
      },
    })
    this.outputColorTransform = false
    this.outputNode = renderOutput(this.scenePass, NoToneMapping)
  }

  override dispose() {
    super.dispose()
    this.scenePass.dispose()
  }
}
