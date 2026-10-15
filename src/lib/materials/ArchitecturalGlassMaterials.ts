import type {Material} from 'three/webgpu'

import {MeshStandardNodeMaterial} from 'three/webgpu'

import {floorGlassThickness} from '../gallery/floors.ts'
import CastFloorGlassMaterial from './CastFloorGlassMaterial.ts'
import ClearGlassMaterial from './ClearGlassMaterial.ts'

export type ArchitecturalGlassMaterials = {
  cabin: Material
  lobby: Material
  tunnel: Material
}

/** Edge length of the cast pavers in the lobby’s 8 m floor window. */
const floorGlassTileSize = 1

const createFastMaterials = (): ArchitecturalGlassMaterials => {
  const material = new MeshStandardNodeMaterial({
    color: '#afd0d4',
    roughness: 0.24,
    metalness: 0,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    envMapIntensity: 0,
  })
  material.name = 'architectural-glass-fast'
  // The tunnel displays keep their original fast-mode pane.
  const tunnel = new MeshStandardNodeMaterial({
    color: '#b7d8d9',
    roughness: 0.16,
    metalness: 0.1,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  })
  tunnel.name = 'tunnel-glass-fast'
  return {
    cabin: material,
    lobby: material,
    tunnel,
  }
}

export function createArchitecturalGlassMaterials(isHeavy: boolean): ArchitecturalGlassMaterials {
  if (!isHeavy) {
    return createFastMaterials()
  }
  return {
    // Old crown-glass window: water-clear, with a warm clearcoat sheen that catches the lodge’s firelight.
    cabin: new ClearGlassMaterial({
      name: 'cabin-glass-heavy',
      ior: 1.52,
      absorption: 0.03,
      specularColor: '#ffeacc',
      clearcoat: 0.5,
      envMapIntensity: 1.2,
    }),
    // Cast pavers that bend the Oculus below into a rippling, dispersive view.
    lobby: new CastFloorGlassMaterial({
      thickness: floorGlassThickness,
      tileSize: floorGlassTileSize,
    }),
    // Low-iron museum display glass whose anti-reflective coating leaves a faint violet and green sheen at grazing angles.
    tunnel: new ClearGlassMaterial({
      name: 'tunnel-glass-heavy',
      ior: 1.5,
      absorption: 0.015,
      iridescence: 0.7,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [220, 420],
      envMapIntensity: 1.3,
    }),
  }
}

export function disposeArchitecturalGlassMaterials(materials: ArchitecturalGlassMaterials) {
  for (const material of new Set(Object.values(materials))) {
    material.dispose()
  }
}
