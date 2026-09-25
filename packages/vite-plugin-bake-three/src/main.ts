import type {PluginOption} from 'vite'
import type {BakeStaticTexturesOptions} from 'vite-plugin-bake-static-textures'
import type {BakeThreeGeometryOptions} from 'vite-plugin-bake-three-geometry'
import type {R3fStaticRenderingOptions} from 'vite-plugin-r3f-static-rendering'

import bakeStaticTextures from 'vite-plugin-bake-static-textures'
import bakeThreeGeometry from 'vite-plugin-bake-three-geometry'
import r3fStaticRendering from 'vite-plugin-r3f-static-rendering'

export type BakeThreeOptions = {
  /** Default randomness-freezing policy for all enabled passes. Per-pass options override it. */
  allowFreezingRandomness?: boolean
  geometry?: BakeThreeGeometryOptions | false
  staticRendering?: R3fStaticRenderingOptions | false
  staticTextures?: BakeStaticTexturesOptions | false
}

/** Compose the Three-specific AOT passes in dependency order. */
export default function bakeThree(options: BakeThreeOptions = {}): Array<PluginOption> {
  const plugins: Array<PluginOption> = []
  const randomness = options.allowFreezingRandomness === undefined ? {} : {allowFreezingRandomness: options.allowFreezingRandomness}
  if (options.geometry !== false) {
    plugins.push(bakeThreeGeometry({
      ...randomness,
      ...options.geometry,
    }))
  }
  if (options.staticTextures !== false) {
    plugins.push(bakeStaticTextures({
      ...randomness,
      ...options.staticTextures,
    }))
  }
  if (options.staticRendering !== false) {
    plugins.push(r3fStaticRendering({
      ...randomness,
      ...options.staticRendering,
      runtimeModule: 'vite-plugin-bake-three/r3f-static-rendering/runtime',
    }))
  }
  return plugins
}

export {default as bakeStaticTextures} from 'vite-plugin-bake-static-textures'
export type {BakeStaticTexturesOptions} from 'vite-plugin-bake-static-textures'
export {default as bakeThreeGeometry} from 'vite-plugin-bake-three-geometry'
export type {BakeThreeGeometryOptions} from 'vite-plugin-bake-three-geometry'
export {default as r3fStaticRendering} from 'vite-plugin-r3f-static-rendering'
export type {R3fStaticRenderingOptions} from 'vite-plugin-r3f-static-rendering'
