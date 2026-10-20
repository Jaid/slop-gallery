import {color, float, mix, mx_noise_float, positionLocal, vertexColor} from 'three/tsl'
import {Material, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

import DamaskWallpaperMaterial from './DamaskWallpaperMaterial.ts'
import {visibleDetail} from './filters.ts'
import gold from './gold.ts'
import metal from './metal.ts'
import UpholsteryVelvetMaterial from './UpholsteryVelvetMaterial.ts'
import WalnutMaterial, {mahogany} from './WalnutMaterial.ts'

/**
 * Every surface of Dine’s feast table, created once and disposed together: French-polished mahogany, oxblood velvet, a crimson damask runner with gilt braid, glazed porcelain, wax candles with their flames and fruit.
 *
 * Gilt pieces and cutlery borrow the gallery’s shared gold and satin steel, which outlive this set and are never disposed with it.
 */
export default class FeastTableMaterials {
  readonly braid = new MeshStandardNodeMaterial({
    metalness: 0.75,
    roughness: 0.42,
  })

  readonly flame = new MeshStandardNodeMaterial({
    color: '#fff0b6',
    emissive: '#ffc96a',
    emissiveIntensity: 4,
    toneMapped: false,
  })

  readonly fruit = new MeshPhysicalNodeMaterial({
    roughness: 0.42,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.5,
  })

  /** shared with the rest of the gallery, never disposed here */
  readonly gold = gold

  readonly porcelain = new MeshPhysicalNodeMaterial({
    color: '#e9e4da',
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 0.8,
  })

  /** a smaller repeat than the Sienna’s wallpaper, so about four columns of the motif run down the runner, on a brighter crimson that still reads red from across the room */
  readonly runner = new DamaskWallpaperMaterial({
    colors: {
      ground: '#700c18',
      shade: '#3e050c',
      gold: '#8f6a30',
    },
    repeat: [0.2, 0.29],
    scale: 0.072,
  })
  /** shared with the rest of the gallery, never disposed here */
  readonly steel = metal

  readonly upholstery = new UpholsteryVelvetMaterial

  readonly wax = new MeshStandardNodeMaterial({
    color: '#eadcbc',
    roughness: 0.55,
    emissive: '#ffb066',
    emissiveIntensity: 0.12,
  })
  readonly wood = new WalnutMaterial({
    colors: mahogany,
    roughness: 0.3,
  })

  constructor() {
    // Twisted gilt threads: a fine, tarnished twist along every cord.
    const footprint = positionLocal.x.fwidth().max(positionLocal.y.fwidth()).max(positionLocal.z.fwidth())
    const twist = mix(float(0.5), mx_noise_float(positionLocal.mul(160)).mul(0.5).add(0.5), visibleDetail(footprint, 1 / 160 / 1.5))
    this.braid.colorNode = mix(color('#6f4c1d'), color('#c9a052'), twist.mul(0.6).add(0.3))
    this.braid.roughnessNode = float(0.36).add(twist.mul(0.16))
    // Fruit takes its color from the geometry, with a faint mottle of the skin.
    const mottle = mx_noise_float(positionLocal.mul(180)).mul(0.08).add(0.96)
    this.fruit.colorNode = vertexColor().mul(mottle)
  }

  dispose() {
    for (const material of Object.values(this)) {
      if (material instanceof Material && material !== gold && material !== metal) {
        material.dispose()
      }
    }
  }
}
