import {expect, test} from 'bun:test'

import {Group, Matrix4, Mesh, PerspectiveCamera, Scene} from 'three/webgpu'

import {updateChangedMatrices} from '../../src/lib/rendering/GalleryRenderer.ts'

const expectSameAsThree = (scene: Scene) => {
  const ours = new Map<string, Matrix4>
  updateChangedMatrices(scene, false)
  scene.traverse(object => ours.set(object.uuid, object.matrixWorld.clone()))
  scene.updateMatrixWorld(true)
  scene.traverse(object => expect(ours.get(object.uuid)!.elements).toEqual(object.matrixWorld.elements))
}
const setup = () => {
  const scene = new Scene
  const room = new Group
  room.position.set(5, 0, 0)
  const statue = new Mesh
  statue.position.set(0, 1, 0)
  const hand = new Group
  room.add(statue)
  scene.add(room, hand)
  return {
    hand,
    room,
    scene,
    statue,
  }
}
test('matrices follow transform changes like three’s update', () => {
  const {room, scene, statue} = setup()
  expectSameAsThree(scene)
  room.rotation.y = 1
  expectSameAsThree(scene)
  statue.scale.set(2, 2, 2)
  expectSameAsThree(scene)
})
test('reparenting updates the world matrix without a transform change', () => {
  const {hand, scene, statue} = setup()
  hand.position.set(0, 2, -3)
  expectSameAsThree(scene)
  hand.add(statue)
  expectSameAsThree(scene)
})
test('manual matrices update when flagged', () => {
  const {scene, statue} = setup()
  expectSameAsThree(scene)
  statue.matrixAutoUpdate = false
  statue.matrix.makeTranslation(3, 3, 3)
  statue.matrixWorldNeedsUpdate = true
  expectSameAsThree(scene)
})
test('unchanged objects keep their matrices', () => {
  const {scene, statue} = setup()
  updateChangedMatrices(scene, false)
  statue.matrixWorld.elements[0] = 7
  updateChangedMatrices(scene, false)
  expect(statue.matrixWorld.elements[0]).toBe(7)
})
test('cameras keep their inverse world matrix', () => {
  const {room, scene} = setup()
  const camera = new PerspectiveCamera
  room.add(camera)
  room.position.x = 9
  updateChangedMatrices(scene, false)
  const product = camera.matrixWorldInverse.clone().multiply(camera.matrixWorld).elements
  const identity = new Matrix4
  for (const [i, value] of identity.elements.entries()) {
    expect(product[i]).toBeCloseTo(value)
  }
})
