import type {KnotPlaceholder, PlaceholderShading} from './types.ts'
import type {MeshStandardNodeMaterialParameters, Texture} from 'three/webgpu'

import {DoubleSide, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

/** Cheap lit surfaces also used permanently by performance graphics. */
export const placeholderPresets = {
  smooth: {
    metalness: 0,
    roughness: 0.45,
  },
  ghost: {
    metalness: 0.06,
    roughness: 0.18,
    transparent: true,
    opacity: 0.34,
    side: DoubleSide,
  },
  metal: {
    metalness: 0.9,
    roughness: 0.24,
  },
  glass: {
    metalness: 0,
    roughness: 0.08,
    transparent: true,
    opacity: 0.45,
  },
  stone: {
    metalness: 0,
    roughness: 0.94,
    flatShading: true,
  },
  liquid: {
    metalness: 0.18,
    roughness: 0.12,
  },
  fabric: {
    metalness: 0,
    roughness: 1,
  },
} satisfies Record<PlaceholderShading, MeshStandardNodeMaterialParameters>

/** Physical detail is optional; no entry shader is evaluated for a placeholder. */
export default function createPlaceholderMaterial(placeholder: KnotPlaceholder, quality = false, environment?: Texture) {
  const options = {
    ...placeholderPresets[placeholder.shading],
    color: placeholder.color,
    envMap: environment ?? null,
  }
  if (!quality) {
    return new MeshStandardNodeMaterial(options)
  }
  const material = new MeshPhysicalNodeMaterial(options)
  switch (placeholder.shading) {
    case 'smooth': {
      material.clearcoat = 0.25
      break
    }
    case 'glass': {
      material.transparent = false
      material.opacity = 1
      material.transmission = 0.86
      material.thickness = 0.3
      material.ior = 1.48
      break
    }
    case 'liquid': {
      material.clearcoat = 1
      material.clearcoatRoughness = 0.06
      material.ior = 1.33
      break
    }
    case 'fabric': {
      material.sheen = 1
      material.sheenColor.copy(material.color)
      material.sheenRoughness = 0.8
      break
    }
    case 'ghost':
    case 'metal':
    case 'stone': {
      break
    }
  }
  return material
}
