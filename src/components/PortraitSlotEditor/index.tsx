import type {PortraitSlot} from '#src/lib/gallery/types.ts'
import type {Group, Mesh, MeshBasicNodeMaterial} from 'three/webgpu'

import {useFrame, useThree} from '@react-three/fiber'
import {useEffect, useRef} from 'react'
import {Vector3} from 'three/webgpu'

import {useGallery} from '#src/lib/gallery.ts'
import {aimedSlot, createSlot, cycleSlotRatio, cycleSlotSize, draggedSlot, flipSlotLabel, moveSlot, previewSlot, removeSlot, slotIssue, slotTarget, usePortraitSlots} from '#src/lib/gallery/portraitSlotStore.ts'
import {invalidSlotColor, slotBorder, slotColors, slotPanels} from '#src/lib/gallery/portraitSlotVisuals.ts'

const ray = (camera: {
  getWorldDirection: (target: Vector3) => Vector3
  position: Vector3
}) => [camera.position.toArray(), camera.getWorldDirection(new Vector3).toArray()] as const

/**
 * `?edit_portrait_slots`: aim at a slot and press ←/→ to cycle its ratio, ↑/↓ to cycle its size, L to move its placard above or below the frame and X to delete it. Hold the left mouse button on a slot to drag it and release to drop it where you aim. Aimed at a bare wall, a preview of a new slot follows the crosshair; the arrows shape it and X or the right mouse button places it. Edits stay in this browser until dumped with the `dump_portrait_slots` WebMCP tool.
 */
export default function PortraitSlotEditor() {
  const camera = useThree(state => state.camera)
  const preview = useRef<PortraitSlot>(null)
  const group = useRef<Group>(null)
  const fills = useRef<Array<Mesh | null>>([])
  const edges = useRef<Array<Mesh | null>>([])
  useFrame(() => {
    const {slots, aimed, dragging} = usePortraitSlots.getState()
    const [origin, direction] = ray(camera)
    const id = dragging ? null : aimedSlot(origin, direction, slots)?.id ?? null
    if (id !== aimed) {
      usePortraitSlots.setState({aimed: id})
    }
    const target = id ? null : slotTarget(origin, direction)
    preview.current = target && (dragging ? draggedSlot(target) : previewSlot(target))
    if (!group.current) {
      return
    }
    group.current.visible = preview.current !== null
    if (!preview.current) {
      return
    }
    const slot = preview.current
    group.current.position.set(...slot.position)
    group.current.rotation.set(0, slot.rotation, 0)
    const color = slotIssue(slot, slots) ? invalidSlotColor : slotColors[slot.ratio]
    for (const [index, [x, y, width, height]] of slotPanels(slot).entries()) {
      const fill = fills.current[index]
      fill?.position.set(x, y, 0)
      fill?.scale.set(width, height, 1)
      ;(fill?.material as MeshBasicNodeMaterial | undefined)?.color.set(color)
      const sides = [
        [x, y + (height - slotBorder) / 2, width, slotBorder],
        [x, y - (height - slotBorder) / 2, width, slotBorder],
        [x + (width - slotBorder) / 2, y, slotBorder, height],
        [x - (width - slotBorder) / 2, y, slotBorder, height],
      ]
      for (const [side, [sideX, sideY, sideWidth, sideHeight]] of sides.entries()) {
        const edge = edges.current[index * 4 + side]
        edge?.position.set(sideX, sideY, 0.005)
        edge?.scale.set(sideWidth, sideHeight, 1)
        ;(edge?.material as MeshBasicNodeMaterial | undefined)?.color.set(color)
      }
    }
  })
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }
      const {aimed: hovered, dragging} = usePortraitSlots.getState()
      // While dragging, the keys shape the dragged slot.
      const aimed = dragging ?? hovered
      const actions: Partial<Record<string, () => void>> = {
        ArrowLeft: () => cycleSlotRatio(aimed, -1),
        ArrowRight: () => cycleSlotRatio(aimed, 1),
        ArrowUp: () => cycleSlotSize(aimed, 1),
        ArrowDown: () => cycleSlotSize(aimed, -1),
        KeyL: () => flipSlotLabel(aimed),
        KeyX: () => {
          if (aimed) {
            removeSlot(aimed)
          } else if (preview.current) {
            createSlot(preview.current)
          }
        },
      }
      const action = actions[event.code]
      if (event.code === 'Escape') {
        usePortraitSlots.setState({dragging: null})
      }
      if (!action) {
        return
      }
      // Editing takes these keys from the game, including the development dump on X.
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) {
        action()
      }
    }
    // Mouse buttons on a slot or a preview belong to the editor; everything else still reaches the game, such as grabbing portraits.
    const mousedown = (event: MouseEvent) => {
      if (!document.pointerLockElement || useGallery.getState().held) {
        return
      }
      const {aimed} = usePortraitSlots.getState()
      if (event.button === 0 && aimed) {
        usePortraitSlots.setState({dragging: aimed})
      } else if (event.button === 2 && preview.current && !usePortraitSlots.getState().dragging) {
        createSlot(preview.current)
      } else {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const mouseup = (event: MouseEvent) => {
      if (event.button !== 0 || !usePortraitSlots.getState().dragging) {
        return
      }
      if (preview.current) {
        moveSlot(preview.current)
      } else {
        usePortraitSlots.setState({dragging: null})
      }
      event.stopImmediatePropagation()
    }
    const cancel = () => usePortraitSlots.setState({dragging: null})
    globalThis.addEventListener('keydown', keydown, {capture: true})
    globalThis.addEventListener('mousedown', mousedown, {capture: true})
    globalThis.addEventListener('mouseup', mouseup, {capture: true})
    window.addEventListener('blur', cancel)
    return () => {
      globalThis.removeEventListener('keydown', keydown, {capture: true})
      globalThis.removeEventListener('mousedown', mousedown, {capture: true})
      globalThis.removeEventListener('mouseup', mouseup, {capture: true})
      window.removeEventListener('blur', cancel)
      cancel()
    }
  }, [camera])
  // A ghost of the new or dragged slot: fainter fill, same outline, no raycast target.
  return <group visible={false} ref={group}>
    {[0, 1].map(index => <mesh
      key={index} raycast={() => {}} renderOrder={2} ref={mesh => {
        fills.current[index] = mesh
      }}
    >
      <planeGeometry />
      <meshBasicNodeMaterial depthWrite={false} opacity={0.18} toneMapped={false} transparent />
    </mesh>)}
    {Array.from({length: 8}, (_, index) => <mesh
      key={index} raycast={() => {}} renderOrder={2} ref={mesh => {
        edges.current[index] = mesh
      }}
    >
      <planeGeometry />
      <meshBasicNodeMaterial depthWrite={false} opacity={0.7} toneMapped={false} transparent />
    </mesh>)}
  </group>
}
