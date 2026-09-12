import type {Material} from 'three/webgpu'

import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

import {floorGlassThickness} from '../gallery/floors.ts'
import {lodgeWindow} from '../gallery/lodge.ts'

export type ArchitecturalGlassMaterials = {
  cabin: Material
  lobby: Material
}

export function createArchitecturalGlassMaterials(isQuality: boolean): ArchitecturalGlassMaterials {
  if (!isQuality) {
    const material = new MeshStandardNodeMaterial({
      color: '#afd0d4',
      roughness: 0.24,
      metalness: 0,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      envMapIntensity: 0,
    })
    material.name = 'architectural-glass-performance'
    return {
      cabin: material,
      lobby: material,
    }
  }
  const cabin = new MeshPhysicalNodeMaterial({
    color: '#f5ead8',
    roughness: 0.14,
    metalness: 0,
    transmission: 0.88,
    ior: 1.52,
    thickness: lodgeWindow.glassThickness,
    attenuationColor: '#c99d68',
    attenuationDistance: 0.3,
    clearcoat: 0.58,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.9,
  })
  cabin.name = 'cabin-glass-quality'
  const lobby = new MeshPhysicalNodeMaterial({
    color: '#f0fcff',
    roughness: 0.035,
    metalness: 0,
    transmission: 0.96,
    ior: 1.46,
    thickness: floorGlassThickness,
    attenuationColor: '#9edce6',
    attenuationDistance: 2.2,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.3,
  })
  lobby.name = 'lobby-glass-quality'
  return {
    cabin,
    lobby,
  }
}

export function disposeArchitecturalGlassMaterials(materials: ArchitecturalGlassMaterials) {
  for (const material of new Set(Object.values(materials))) {
    material.dispose()
  }
}
