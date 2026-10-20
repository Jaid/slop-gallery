import {BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {place as move} from '../lodgeInterior/place.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import dineTable, {banquetSettings} from './layout.ts'
import {slab} from './parts.ts'

/** Custom profile geometries need constructor arguments, while BufferGeometry.clone() calls a zero-argument constructor. */
const copy = (source: BufferGeometry) => {
  const geometry = new BufferGeometry
  return geometry.copy(source)
}

/** A fully laid banquet: porcelain on gilt chargers, folded napkins, cutlery, hollow goblets, covered tureens and fifteen tapers. */
export default class FeastServiceGeometry {
  readonly brass: BufferGeometry
  readonly flames: BufferGeometry
  readonly linen: BufferGeometry
  readonly napkins: BufferGeometry
  readonly porcelain: BufferGeometry
  readonly silver: BufferGeometry
  readonly wax: BufferGeometry

  constructor() {
    const porcelain: Array<BufferGeometry> = []
    const brass: Array<BufferGeometry> = []
    const silver: Array<BufferGeometry> = []
    const napkins: Array<BufferGeometry> = []
    const wax: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    const {height: top, runner} = dineTable
    // One closed, gently rounded runner with narrow metallic-thread hems.
    this.linen = slab(runner.width, runner.length, 0.004, 0.04, top + 0.005, 0.001)
    for (const side of [-1, 1]) {
      brass.push(move(new BoxGeometry(0.004, 0.001, runner.length - 0.1), side * (runner.width / 2 - 0.018), top + 0.0058, 0))
    }
    const plate = new RevolvedProfileGeometry([
      [0, 0.018],
      [0.092, 0.018],
      [0.115, 0.022],
      [0.139, 0.034],
      [0.154, 0.035],
      [0.16, 0.029],
      [0.156, 0.02],
      [0.11, 0.008],
      [0.065, 0.004],
      [0, 0.004],
    ], {sides: 40})
    const charger = new RevolvedProfileGeometry([
      [0, 0.005],
      [0.13, 0.005],
      [0.17, 0.014],
      [0.182, 0.014],
      [0.184, 0.008],
      [0.17, 0.002],
      [0, 0.002],
    ], {sides: 40})
    const goblet = new RevolvedProfileGeometry([
      [0, 0.142],
      [0.025, 0.15],
      [0.045, 0.18],
      [0.052, 0.23],
      [0.052, 0.252],
      [0.057, 0.252],
      [0.058, 0.23],
      [0.052, 0.18],
      [0.033, 0.147],
      [0.009, 0.133],
      [0.007, 0.025],
      [0.047, 0.012],
      [0.05, 0.005],
      [0.048, 0.001],
      [0, 0.001],
    ], {sides: 24})
    const fold = new Shape
    fold.moveTo(-0.11, 0.1)
    fold.lineTo(0.11, 0.1)
    fold.lineTo(0.07, -0.14)
    fold.lineTo(-0.045, -0.105)
    fold.closePath()
    const napkin = new ExtrudeGeometry(fold, {
      depth: 0.004,
      bevelEnabled: false,
      steps: 1,
    })
    napkin.rotateX(-Math.PI / 2).rotateY(-0.25).translate(0, 0.039, 0)
    try {
      for (const setting of banquetSettings) {
        const at = (geometry: BufferGeometry) => geometry.rotateY(setting.yaw).translate(...setting.position)
        porcelain.push(at(copy(plate)))
        brass.push(at(copy(charger)), at(copy(goblet).translate(0.225, 0, -0.18)))
        const plateRim = new TorusGeometry(0.146, 0.0018, 4, 40)
        brass.push(at(plateRim.rotateX(Math.PI / 2).translate(0, 0.035, 0)))
        napkins.push(at(napkin.clone()))
        // A second fold breaks the napkin’s flat face, with a slim napkin ring across its middle.
        const pleat = new BoxGeometry(0.016, 0.008, 0.2)
        napkins.push(at(pleat.rotateY(-0.25).translate(-0.02, 0.046, 0)))
        const napkinRing = new TorusGeometry(0.034, 0.004, 6, 16)
        brass.push(at(napkinRing.scale(1.3, 0.28, 1).rotateX(Math.PI / 2).translate(0, 0.048, 0)))
        // Cutlery points inward: a four-tined fork on the left and a broad-bladed knife on the right.
        silver.push(at(move(new BoxGeometry(0.012, 0.006, 0.18), -0.215, 0.007, 0.035)))
        silver.push(at(move(new BoxGeometry(0.03, 0.006, 0.025), -0.215, 0.007, -0.065)))
        for (let tine = 0; tine < 4; tine++) {
          silver.push(at(move(new BoxGeometry(0.004, 0.006, 0.04), -0.227 + tine * 0.008, 0.007, -0.093)))
        }
        silver.push(at(move(new BoxGeometry(0.014, 0.009, 0.12), 0.215, 0.008, 0.065)))
        silver.push(at(move(new BoxGeometry(0.023, 0.004, 0.115), 0.211, 0.007, -0.052)))
      }
    } finally {
      for (const geometry of [plate, charger, goblet, napkin]) {
        geometry.dispose()
      }
    }
    for (const z of dineTable.candelabras) {
      const place = (geometry: BufferGeometry) => geometry.translate(0, top + 0.006, z)
      brass.push(place(new RevolvedProfileGeometry([
        [0, 0.39],
        [0.04, 0.39],
        [0.055, 0.34],
        [0.03, 0.3],
        [0.023, 0.13],
        [0.05, 0.085],
        [0.11, 0.035],
        [0.12, 0.015],
        [0.115, 0],
        [0, 0],
      ], {sides: 24})))
      // Four scrolling branches surround the taller central candle; all flames are emissive geometry, not extra shadowed lights.
      const candles = [[0, 0.47, 0], [-0.23, 0.35, 0], [0.23, 0.35, 0], [0, 0.35, -0.24], [0, 0.35, 0.24]] as const
      for (const [x, y, dz] of candles) {
        if (x || dz) {
          const curve = new CatmullRomCurve3([
            new Vector3(0, 0.27, 0),
            new Vector3(x * 0.5, 0.21, dz * 0.5),
            new Vector3(x, 0.24, dz),
            new Vector3(x, y, dz),
          ])
          brass.push(place(new TubeGeometry(curve, 14, 0.009, 6, false)))
        } else {
          brass.push(place(move(new CylinderGeometry(0.018, 0.025, 0.11, 12), 0, 0.425, 0)))
        }
        const dripPan = new RevolvedProfileGeometry([
          [0, 0.018],
          [0.03, 0.018],
          [0.055, 0.025],
          [0.057, 0.015],
          [0.03, 0],
          [0, 0],
        ], {sides: 20})
        brass.push(place(dripPan.translate(x, y, dz)))
        wax.push(place(move(new CylinderGeometry(0.017, 0.019, 0.205, 12), x, y + 0.115, dz)))
        const flame = new SphereGeometry(1, 10, 8)
        flames.push(place(flame.scale(0.012, 0.033, 0.012).translate(x, y + 0.25, dz)))
      }
    }
    // Twin oval porcelain tureens with domed lids, gilded lips, finials and loop handles.
    for (const z of [-2.25, 2.25]) {
      const place = (geometry: BufferGeometry) => geometry.scale(1, 1, 1.65).translate(0, top + 0.006, z)
      porcelain.push(place(new RevolvedProfileGeometry([
        [0, 0.29],
        [0.045, 0.29],
        [0.1, 0.275],
        [0.17, 0.23],
        [0.235, 0.185],
        [0.23, 0.16],
        [0.21, 0.09],
        [0.135, 0.035],
        [0.12, 0.01],
        [0.09, 0],
        [0, 0],
      ], {sides: 32})))
      for (const y of [0.17, 0.188]) {
        const rim = new TorusGeometry(0.234, 0.004, 6, 32)
        brass.push(place(rim.rotateX(Math.PI / 2).translate(0, y, 0)))
      }
      const finial = new SphereGeometry(0.025, 12, 8)
      brass.push(place(finial.scale(1, 0.7, 1).translate(0, 0.304, 0)))
      for (const side of [-1, 1]) {
        const handle = new TorusGeometry(0.048, 0.007, 6, 20)
        brass.push(place(handle.rotateY(Math.PI / 2).translate(side * 0.24, 0.16, 0)))
      }
    }
    this.porcelain = mergeParts(porcelain)
    this.brass = mergeParts(brass)
    this.silver = mergeParts(silver)
    this.napkins = mergeParts(napkins)
    this.wax = mergeParts(wax)
    this.flames = mergeParts(flames)
  }

  dispose() {
    for (const geometry of [this.porcelain, this.brass, this.silver, this.linen, this.napkins, this.wax, this.flames]) {
      geometry.dispose()
    }
  }
}
