import {expect, test} from 'bun:test'

import antechamberDome, {antechamberDomeCrownY, antechamberDomeGeometry, antechamberLatticeGeometry, antechamberLatticeY} from '../../src/lib/gallery/antechamberDome.ts'
import {roomClearHeight, rooms} from '../../src/lib/gallery/walls.ts'

const antechamber = rooms.find(room => room.id === 'antechamber')!
test('the dome springs from the top of the ceiling slab and stays inside the walls', () => {
  expect(antechamberDome.springY).toBeCloseTo(antechamber.height - 0.02 + 0.09, 9)
  expect(antechamberDome.radius).toBeLessThan(antechamber.size[0] / 2 - 0.105)
  expect(roomClearHeight(antechamber)).toBeCloseTo(antechamberDomeCrownY - antechamber.floorY, 9)
})
test('the shell leaves out a ring of windows and the oculus', () => {
  const geometry = antechamberDomeGeometry()
  const [around, up] = antechamberDome.segments
  const {count, head, sill, width} = antechamberDome.windows
  const step = 90 / up
  const windowFaces = count * (width / step) * ((head - sill) / step) * 2
  // The topmost row of the sphere has one triangle per segment, every other row two.
  const oculusRows = (90 - antechamberDome.oculus) / step
  const oculusFaces = around * (oculusRows * 2 - 1)
  const allFaces = around * (up * 2 - 1)
  expect(geometry.getIndex()!.count / 3).toBe(allFaces - windowFaces - oculusFaces)
})
test('the lattice rests on the rim of the oculus and covers it', () => {
  const lattice = antechamberLatticeGeometry()
  lattice.computeBoundingBox()
  const {min, max} = lattice.boundingBox!
  const oculusRadius = antechamberDome.radius * Math.cos(antechamberDome.oculus * Math.PI / 180)
  expect(max.x).toBeGreaterThan(oculusRadius)
  // The geometry holds 32-bit floats.
  expect(min.y).toBeCloseTo(0, 6)
  expect(max.y).toBeCloseTo(antechamberDome.latticeDepth, 6)
  expect(antechamberLatticeY).toBeLessThan(antechamberDome.radius * Math.sin(antechamberDome.oculus * Math.PI / 180))
})
