import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {BoxGeometry, Mesh, MeshBasicMaterial, Quaternion, Raycaster, TubeGeometry, Vector3} from 'three/webgpu'

import lowerGallery, {oculusRamps} from '../../src/lib/gallery/lowerGallery.ts'
import OculusGroundGeometry from '../../src/lib/gallery/OculusGroundGeometry.ts'
import tower, {towerRamp as ramp} from '../../src/lib/gallery/oculusTower.ts'
import RailingPath from '../../src/lib/gallery/railings/RailingPath.ts'
import {addOculusRailings, oculusRailing as railing} from './helpers/oculusRailings.ts'

await RAPIER.init()
describe('connected Oculus railings', () => {
  test('one finite path connects both lower ramps, the base and the entire open tower perimeter', () => {
    const first = railing.anchors[0]
    const last = railing.anchors.at(-1)!
    expect(first.ground[2]).toBe(oculusRamps[0].startZ)
    expect(last.ground[2]).toBe(oculusRamps[1].startZ)
    expect(first.ground[0]).toBeCloseTo(-last.ground[0])
    expect(railing.length).toBeGreaterThan(45)
    for (let i = 0; i <= 200; i++) {
      const point = railing.getPoint(i / 200)
      const opposite = railing.getPoint(1 - i / 200)
      expect([point.x, point.y, point.z].every(Number.isFinite)).toBe(true)
      expect(point.x).toBeCloseTo(2 * tower.x - opposite.x, 5)
      expect(point.y).toBeCloseTo(opposite.y, 5)
      expect(point.z).toBeCloseTo(opposite.z, 5)
    }
    const tube = new TubeGeometry(railing, Math.ceil(railing.length / 0.04), railing.radius, 12, false)
    try {
      expect([...tube.getAttribute('position').array].every(Number.isFinite)).toBe(true)
      expect([...tube.getAttribute('normal').array].every(Number.isFinite)).toBe(true)
    } finally {
      tube.dispose()
    }
  })
  test('tower junctions never reverse direction or fold the rendered tube inside out', () => {
    const points = railing.anchors.map(({ground, height}) => new Vector3(ground[0], ground[1] + height, ground[2]))
    for (let i = 1; i < points.length - 1; i++) {
      const incoming = points[i].clone().sub(points[i - 1])
      const outgoing = points[i + 1].clone().sub(points[i])
      expect(incoming.angleTo(outgoing)).toBeLessThan(Math.PI / 6)
    }
    const tube = new TubeGeometry(railing, Math.ceil(railing.length / 0.04), railing.radius, 12, false)
    try {
      const positions = tube.getAttribute('position')
      const normals = tube.getAttribute('normal')
      const indices = tube.index!
      for (let i = 0; i < indices.count; i += 3) {
        const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
        const [a, b, c] = ids.map(index => (new Vector3).fromBufferAttribute(positions, index))
        const face = b.sub(a).cross(c.sub(a)).normalize()
        const outward = ids.reduce((sum, index) => sum.add((new Vector3).fromBufferAttribute(normals, index)), new Vector3).normalize()
        expect(face.dot(outward)).toBeGreaterThan(0.9)
      }
    } finally {
      tube.dispose()
    }
  })
  test('tower rails and posts are half-height while the lower ramp rails remain one meter tall', () => {
    const perimeter = railing.anchors.filter(anchor => anchor.ground[2] > ramp.endZ && Math.abs(anchor.ground[0] - tower.x) < 3)
    expect(perimeter.length).toBeGreaterThan(100)
    for (const anchor of perimeter) {
      expect(anchor.height).toBe(0.5)
      expect(anchor.ground[1]).toBe(ramp.endY)
    }
    for (const anchor of railing.anchors.filter(value => Math.abs(value.ground[0]) > 3)) {
      expect(anchor.height).toBe(1)
    }
    for (const post of railing.posts.filter(value => value.position[2] > ramp.endZ && Math.abs(value.position[0]) < 3)) {
      expect(post.height).toBe(0.5)
      expect(post.position[1]).toBe(ramp.endY + 0.25)
    }
    expect(Math.min(...railing.anchors.map(anchor => anchor.height))).toBe(0.5)
    expect(Math.max(...railing.anchors.map(anchor => anchor.height))).toBe(1)
  })
  test('the linked rail colliders meet at every joint without closing the tower entrance', () => {
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    try {
      addOculusRailings(world)
      world.step()
      const axis = new Vector3(0, 1, 0)
      for (const [i, segment] of railing.segments.entries()) {
        const rotation = new Quaternion(...segment.rotation)
        const start = new Vector3(...segment.position).add(axis.clone().applyQuaternion(rotation).multiplyScalar(-segment.halfLength))
        const end = new Vector3(...segment.position).add(axis.clone().applyQuaternion(rotation).multiplyScalar(segment.halfLength))
        expect(start.distanceTo(railing.getPoint(railing.distances[i] / railing.length))).toBeLessThan(0.000_01)
        expect(end.distanceTo(railing.getPoint(railing.distances[i + 1] / railing.length))).toBeLessThan(0.000_01)
      }
      expect(world.castRay(new RAPIER.Ray(new Vector3(tower.x, ramp.endY + 0.4, ramp.endZ - 0.4), new Vector3(0, 0, 1)), 1.5, true)).toBeNull()
      expect(world.castRay(new RAPIER.Ray(new Vector3(tower.x, ramp.endY + 0.5, tower.z), new Vector3(0, 0, 1)), tower.radius + 0.5, true)).not.toBeNull()
    } finally {
      world.free()
    }
  })
  test('every post stands on the existing stone instead of floating outside the rounded edges', () => {
    const ground = new OculusGroundGeometry
    const floor = new BoxGeometry(lowerGallery.oculus.size[0], 0.24, lowerGallery.oculus.size[1]).translate(lowerGallery.oculus.center[0], lowerGallery.floorY - 0.12, lowerGallery.oculus.center[1])
    const material = new MeshBasicMaterial
    const meshes = [new Mesh(ground, material), new Mesh(floor, material)]
    try {
      for (const post of railing.posts) {
        const baseY = post.position[1] - post.height / 2
        const hit = new Raycaster(new Vector3(post.position[0], baseY + 0.1, post.position[2]), new Vector3(0, -1, 0), 0, 0.2).intersectObjects(meshes)[0]
        expect(hit).toBeDefined()
        expect(hit.point.y).toBeCloseTo(baseY, 2)
      }
    } finally {
      ground.dispose()
      floor.dispose()
      material.dispose()
    }
  })
  test('degenerate paths fail before creating invalid tubes or physics shapes', () => {
    expect(() => new RailingPath([])).toThrow(RangeError)
    expect(() => new RailingPath([
      {
        ground: [0, 0, 0],
        height: 1,
      }, {
        ground: [0, 0, 0],
        height: 1,
      },
    ])).toThrow(RangeError)
    expect(() => new RailingPath([
      {
        ground: [0, 0, 0],
        height: 1,
      }, {
        ground: [1, 0, 0],
        height: 0,
      },
    ])).toThrow(RangeError)
  })
})
