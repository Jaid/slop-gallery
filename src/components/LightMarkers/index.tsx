import type {InstancedMesh, Light} from 'three/webgpu'

import {useFrame, useThree} from '@react-three/fiber'
import {useEffect, useRef} from 'react'
import {Color, Matrix4, Vector2, Vector3} from 'three/webgpu'

import {isTextInput, notify} from '#src/lib/gallery.ts'
import {changeLightDecay, changeLightRange, changeLightStrength, isEditingLights, moveLight, placeLight, resetLight, toggleLight, useLightEdits} from '#src/lib/rendering/lightLevels.ts'

type Positional = Light & {
  isPointLight?: boolean
  isRectAreaLight?: boolean
  isSpotLight?: boolean
}

/** the most lights that get a marker */
const capacity = 1024
/** marker radius in meters, larger for the aimed light and larger still for the focused one */
const radius = 0.12
const aimedRadius = 0.2
const focusedRadius = 0.26
/** the dark rim around each dot, as a share of its radius, so dots read against bright ceilings too */
const rim = 1.45
/** how far away a light can be aimed at */
const reach = 40
const offColor = new Color('#3a3a3a')
const position = new Vector3
const origin = new Vector3
const direction = new Vector3
const offset = new Vector3
const matrix = new Matrix4
const color = new Color
const pointer = new Vector2
const forward = new Vector3
const right = new Vector3
const step = new Vector3
const up = new Vector3(0, 1, 0)
/** how far one numpad press moves the focused light, in meters */
const moveStep = 0.1
/** numpad keys that move the focused light: along the view’s heading and its right side, flattened to the floor, and straight up */
const moveKeys: Partial<Record<string, readonly [number, number, number]>> = {
  Numpad8: [1, 0, 0],
  Numpad2: [-1, 0, 0],
  Numpad6: [0, 1, 0],
  Numpad4: [0, -1, 0],
  Numpad9: [0, 0, 1],
  Numpad3: [0, 0, -1],
}
/** the lights marked this frame, reused across frames */
const found: Array<Light> = []
/** Lights without a position of their own, like the sun, can name where their marker goes with `userData.marker`, a world position. */
const isMarked = (light: Positional) => Boolean(light.isPointLight || light.isSpotLight || light.isRectAreaLight || light.userData.marker)
const markerPosition = (light: Light, target: Vector3) => {
  const marker = light.userData.marker as [number, number, number] | undefined
  return marker ? target.set(...marker) : target.setFromMatrixPosition(light.matrixWorld)
}
/** The marked light nearest along a ray, within a tolerance that widens with distance, so far lights stay as easy to hit as near ones. */
const pick = (lights: ReadonlyArray<Light>, from: Vector3, toward: Vector3) => {
  let nearest = reach
  let picked: Light | null = null
  for (const light of lights) {
    markerPosition(light, offset).sub(from)
    const along = offset.dot(toward)
    if (!(along > 0.2 && along < nearest && offset.addScaledVector(toward, -along).length() < radius * 1.5 + along * 0.015)) {
      continue
    }
    nearest = along
    picked = light
  }
  return picked
}
/** A readable name for a light in notices: its own name, or its type and the nearest named ancestor. */
const describe = (light: Light) => {
  if (light.name) {
    return light.name
  }
  let parent = light.parent
  while (parent && !parent.name) {
    parent = parent.parent
  }
  return parent ? `${light.type} in ${parent.name}` : light.type
}
/** key that copies every light switched off or made stronger or weaker to the clipboard */
const copyEditsKey = 'KeyK'
const formatPosition = ({x, y, z}: Vector3) => `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`
/** One line per edited light: its name, `off` or its strength factor, its range and decay and its world position, which tells apart lights of the same name. */
const listEdits = () => {
  const {moved, off, reshaped, strengths} = useLightEdits.getState()
  return [...new Set([...off, ...strengths.keys(), ...reshaped, ...moved])].map(light => {
    const strength = strengths.get(light) ?? 1
    const level = off.has(light) ? 'off' : `×${strength.toFixed(2)}`
    const {decay, distance} = light as Light & {
      decay?: number
      distance?: number
    }
    const where = `, ${moved.has(light) ? 'moved to' : 'at'} ${formatPosition(light.getWorldPosition(position))}`
    return `${describe(light)}: ${level}${distance ? `, range ${distance.toFixed(1)} m` : ''}${decay === undefined ? '' : `, decay ${decay.toFixed(2)}`}${where}`
  }).join('\n')
}
/** Puts the list on the clipboard, telling how many lights it holds. */
const copyEdits = async (list: string) => {
  try {
    await navigator.clipboard.writeText(list)
    notify(`Copied ${list.split('\n').filter(Boolean).length} edited lights`)
  } catch {
    notify('Could not copy; the list is in the console')
  }
}
/**
 * `?show_lights`: a glowing, dark-rimmed dot in the color of every point, spot and area light and every light with a `userData.marker`, seen through walls, dark gray for lights switched off. With
 * `?edit_lights`, the light the camera aims at grows: E switches it off and on, ←/→ make it weaker or stronger and ↓/↑ shorten or extend its range and Numpad 7/1 make it fade faster or more gently, for the rest of the page session.
 * Left-clicking a marker focuses its light, which then takes these keys wherever the camera aims, until a click on another marker or anything else. Numpad 8, 2, 4 and 6 move the focused light forward, back, left and right of the view, 9 and 3 up and down, 5 puts it at the camera, 0 undoes all its edits, and K copies every edit.
 */
export default function LightMarkers() {
  const camera = useThree(state => state.camera)
  const scene = useThree(state => state.scene)
  const canvas = useThree(state => state.renderer.domElement)
  const markers = useRef<InstancedMesh>(null)
  const rims = useRef<InstancedMesh>(null)
  useFrame(() => {
    const mesh = markers.current
    const backing = rims.current
    if (!mesh || !backing) {
      return
    }
    found.length = 0
    scene.traverseVisible(object => {
      if ((object as Light).isLight && isMarked(object as Positional) && found.length < capacity) {
        found.push(object as Light)
      }
    })
    let aimed: Light | null = null
    if (isEditingLights) {
      camera.getWorldPosition(origin)
      camera.getWorldDirection(direction)
      aimed = pick(found, origin, direction)
      if (aimed !== useLightEdits.getState().aimed) {
        useLightEdits.setState({aimed})
      }
    }
    const {focused, off} = useLightEdits.getState()
    for (const [index, light] of found.entries()) {
      const size = light === focused ? focusedRadius : (light === aimed ? aimedRadius : radius)
      markerPosition(light, position)
      mesh.setMatrixAt(index, matrix.makeScale(size, size, size).setPosition(position))
      backing.setMatrixAt(index, matrix.makeScale(size * rim, size * rim, size * rim).setPosition(position))
      mesh.setColorAt(index, off.has(light) ? offColor : color.copy(light.color).multiplyScalar(light === aimed || light === focused ? 3 : 1.5))
    }
    mesh.count = found.length
    backing.count = found.length
    mesh.instanceMatrix.needsUpdate = true
    backing.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  })
  useEffect(() => {
    if (!isEditingLights) {
      return
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.code === copyEditsKey && !event.repeat && !isTextInput(event.target)) {
        const list = listEdits()
        console.info(list)
        copyEdits(list).catch(console.error)
        return
      }
      const {aimed: looked, focused} = useLightEdits.getState()
      const move = moveKeys[event.code]
      // Lights placed by a marker, like the sun, have no position of their own to move, but can still be reset.
      if ((event.code === 'Numpad0' || (move || event.code === 'Numpad5') && !focused?.userData.marker) && focused && !event.ctrlKey && !event.metaKey && !event.altKey && !isTextInput(event.target)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        let at: Vector3
        if (event.code === 'Numpad0') {
          at = resetLight(focused)
        } else if (event.code === 'Numpad5') {
          at = placeLight(focused, camera.getWorldPosition(step))
        } else {
          camera.getWorldDirection(forward).setY(0).normalize()
          right.crossVectors(forward, up)
          step.set(0, 0, 0).addScaledVector(forward, move![0]).addScaledVector(right, move![1]).addScaledVector(up, move![2]).multiplyScalar(moveStep)
          at = moveLight(focused, step)
        }
        notify(`${describe(focused)}: ${event.code === 'Numpad0' ? 'reset, ' : ''}at ${formatPosition(at)}`)
        return
      }
      const aimed = focused ?? looked
      if (!aimed || event.ctrlKey || event.metaKey || event.altKey || isTextInput(event.target)) {
        return
      }
      const strength = (steps: number) => notify(`${describe(aimed)}: strength ×${changeLightStrength(aimed, steps).toFixed(2)}`)
      const range = (steps: number) => {
        const distance = changeLightRange(aimed, steps)
        notify(distance === undefined ? `${describe(aimed)} has no range` : `${describe(aimed)}: range ${distance.toFixed(1)} m`)
      }
      const decay = (steps: number) => {
        const value = changeLightDecay(aimed, steps)
        notify(value === undefined ? `${describe(aimed)} has no decay` : `${describe(aimed)}: decay ${value.toFixed(2)}`)
      }
      const actions: Partial<Record<string, () => void>> = {
        KeyE: () => {
          if (!event.repeat) {
            notify(`${describe(aimed)} ${toggleLight(aimed) ? 'on' : 'off'}`)
          }
        },
        ArrowLeft: () => strength(-1),
        ArrowRight: () => strength(1),
        ArrowDown: () => range(-1),
        ArrowUp: () => range(1),
        Numpad7: () => decay(1),
        Numpad1: () => decay(-1),
      }
      const action = actions[event.code]
      if (!action) {
        return
      }
      // Aimed at or focused on a light, these keys belong to the editor instead of the game.
      event.preventDefault()
      event.stopImmediatePropagation()
      action()
    }
    // With the pointer locked, a click picks what the camera aims at; otherwise what is under the pointer.
    const mousedown = (event: MouseEvent) => {
      if (event.button !== 0 || !document.pointerLockElement && event.target !== canvas) {
        return
      }
      let clicked = useLightEdits.getState().aimed
      if (!document.pointerLockElement) {
        const bounds = canvas.getBoundingClientRect()
        pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
        camera.getWorldPosition(origin)
        direction.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(origin).normalize()
        clicked = pick(found, origin, direction)
      }
      const {focused} = useLightEdits.getState()
      if (clicked === focused) {
        return
      }
      useLightEdits.setState({focused: clicked})
      notify(clicked ? `Focused ${describe(clicked)}` : `Unfocused ${describe(focused!)}`)
      // A click on a marker belongs to the editor; a click elsewhere only unfocuses on its way to the game.
      if (clicked) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    globalThis.addEventListener('keydown', keydown, {capture: true})
    globalThis.addEventListener('mousedown', mousedown, {capture: true})
    return () => {
      globalThis.removeEventListener('keydown', keydown, {capture: true})
      globalThis.removeEventListener('mousedown', mousedown, {capture: true})
      useLightEdits.setState({
        aimed: null,
        focused: null,
      })
    }
  }, [camera, canvas])
  // Drawn over everything, so lights hidden in fixtures or behind walls can be found too.
  return <>
    <instancedMesh args={[undefined, undefined, capacity]} count={0} frustumCulled={false} name='light-marker-rims' raycast={() => {}} renderOrder={10} ref={rims}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicNodeMaterial color='#000000' depthTest={false} depthWrite={false} opacity={0.75} transparent />
    </instancedMesh>
    <instancedMesh args={[undefined, undefined, capacity]} count={0} frustumCulled={false} name='light-markers' raycast={() => {}} renderOrder={11} ref={markers}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicNodeMaterial depthTest={false} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  </>
}
