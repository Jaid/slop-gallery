import type {Placement, PortraitRatio, PortraitSlot, Vec3} from './types.ts'

import optis from 'optis'
import readPermalink from 'read-permalink'
import {create} from 'zustand'

import placement from '#level/placement.ts'

import {asPortrait, slotFrame, slotSizes} from '../placement/portraitSlots.ts'
import {wallPosition} from '../placement/wallGeometry.ts'
import shippedSlots from './slots.ts'

const enabledValues = new Set<unknown>([true, '', 'true'])
const editingSchema = optis({
  defaults: {
    edit_portrait_slots: false,
  },
  normalizations: {
    edit_portrait_slots(value: unknown) {
      return enabledValues.has(value)
    },
  },
})

/** Read the `?edit_portrait_slots` flag; a bare `?edit_portrait_slots` counts as enabled. */
export function readPortraitSlotEditing(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: editingSchema}).edit_portrait_slots
}

/** whether this page was opened with `?edit_portrait_slots`, read once at startup */
export const isEditingPortraitSlots = readPortraitSlotEditing()

const ratioCycle: ReadonlyArray<PortraitRatio> = ['1:1', '2:3', '3:2']
const storageKey = 'slop-gallery.portrait-slot-edits'
// Edits are kept only as long as the shipped slots they started from stay the same.
const baseline = JSON.stringify(shippedSlots)

type PortraitSlotState = {
  /** the slot under the crosshair while editing */
  aimed: string | null
  /** the slot picked up with the left mouse button, following the crosshair until dropped */
  dragging: string | null
  slots: ReadonlyArray<PortraitSlot>
  /** the ratio and longer edge the next new slot gets, following the last edit */
  template: readonly [PortraitRatio, number]
}

function restore(): ReadonlyArray<PortraitSlot> {
  if (!isEditingPortraitSlots) {
    return shippedSlots
  }
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as {
      baseline: string
      slots: Array<PortraitSlot>
    } | null
    return stored?.baseline === baseline ? stored.slots : shippedSlots
  } catch {
    return shippedSlots
  }
}

/** The level’s portrait slots: the shipped ones, or with `?edit_portrait_slots` the ones edited in this browser. */
export const usePortraitSlots = create<PortraitSlotState>(() => ({
  aimed: null,
  dragging: null,
  template: ['1:1', slotSizes[1]],
  slots: restore(),
}))

if (isEditingPortraitSlots) {
  usePortraitSlots.subscribe((state, previous) => {
    if (state.slots === previous.slots) {
      return
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        baseline,
        slots: state.slots,
      }))
    } catch {
      // Edits still apply for this session.
    }
  })
}
const longerEdge = (slot: PortraitSlot) => Math.max(slot.width, slot.height)
const nextRatio = (ratio: PortraitRatio, step: -1 | 1) => ratioCycle[(ratioCycle.indexOf(ratio) + step + ratioCycle.length) % ratioCycle.length]
/** Switches the aimed slot, or the preview of a new one, to the previous or next ratio, keeping its longer edge. */
export function cycleSlotRatio(id: string | null, step: -1 | 1) {
  if (!id) {
    usePortraitSlots.setState(({template: [ratio, size]}) => ({template: [nextRatio(ratio, step), size]}))
    return
  }
  replace(id, slot => resized(slot, nextRatio(slot.ratio, step), longerEdge(slot)))
}
/** Switches the aimed slot, or the preview of a new one, to the next larger or smaller of the slot sizes, wrapping around. */
export function cycleSlotSize(id: string | null, step: -1 | 1) {
  if (!id) {
    usePortraitSlots.setState(({template: [ratio, size]}) => ({template: [ratio, nextSize(size, step)]}))
    return
  }
  replace(id, slot => resized(slot, slot.ratio, nextSize(longerEdge(slot), step)))
}
export function removeSlot(id: string) {
  usePortraitSlots.setState(state => ({
    slots: state.slots.filter(slot => slot.id !== id),
    aimed: state.aimed === id ? null : state.aimed,
    dragging: state.dragging === id ? null : state.dragging,
  }))
}
/** The slot that X would create where a placement ray meets a wall, shaped like the last edited one. */
export function previewSlot(target: Placement): PortraitSlot {
  const {slots, template} = usePortraitSlots.getState()
  let index = 0
  while (slots.some(slot => slot.id === `${target.wallId}-custom-${index}`)) {
    index++
  }
  return {
    id: `${target.wallId}-custom-${index}`,
    wallId: target.wallId,
    ratio: template[0],
    ...slotFrame(...template),
    position: target.position,
    rotation: target.rotation,
  }
}

/** The dragged slot as it would hang where a placement ray meets a wall, or `null` if nothing is dragged. */
export function draggedSlot(target: Placement): PortraitSlot | null {
  const {dragging, slots} = usePortraitSlots.getState()
  const slot = slots.find(candidate => candidate.id === dragging)
  return slot ? {
    ...slot,
    wallId: target.wallId,
    position: target.position,
    rotation: target.rotation,
  } : null
}
/** Hangs a slot at the place of `moved`, keeping its id. */
export function moveSlot(moved: PortraitSlot) {
  usePortraitSlots.setState(state => ({
    slots: state.slots.map(slot => (slot.id === moved.id ? moved : slot)),
    aimed: moved.id,
    dragging: null,
  }))
}
export function createSlot(slot: PortraitSlot) {
  usePortraitSlots.setState(state => ({
    slots: [...state.slots, slot],
    aimed: slot.id,
  }))
}
/** Why a slot cannot hang where it is among the other slots, or an empty string if it can. */
export function slotIssue(slot: PortraitSlot, slots: ReadonlyArray<PortraitSlot>) {
  const wall = placement.wall(slot.wallId)
  if (!wall) {
    return 'unknown wall'
  }
  return placement.placementIssue(wall, slot.position, slot.width, slot.height, slots.map(asPortrait), slot.id, slot.labelAbove)
}
/** The slot a ray from the eye first meets, frame or placard, unless a wall is in the way, or `null`. */
export function aimedSlot(origin: Vec3, direction: Vec3, slots: ReadonlyArray<PortraitSlot>) {
  const wallHit = placement.findPlacement(origin, direction, 0, 0, [])
  const reach = wallHit ? Math.hypot(...wallHit.position.map((value, index) => value - origin[index])) + 0.05 : Infinity
  let nearest: PortraitSlot | null = null
  let nearestDistance = reach
  for (const slot of slots) {
    const normal = [Math.sin(slot.rotation), 0, Math.cos(slot.rotation)] as const
    const facing = direction[0] * normal[0] + direction[2] * normal[2]
    if (facing > -1e-6) {
      continue
    }
    const distance = ((slot.position[0] - origin[0]) * normal[0] + (slot.position[2] - origin[2]) * normal[2]) / facing
    if (distance <= 0 || distance >= nearestDistance) {
      continue
    }
    const hit = origin.map((value, index) => value + direction[index] * distance)
    const across = (hit[0] - slot.position[0]) * Math.cos(slot.rotation) - (hit[2] - slot.position[2]) * Math.sin(slot.rotation)
    const up = hit[1] - slot.position[1]
    // The placard sits about 0.7 m beyond the frame on its side.
    const [low, high] = slot.labelAbove ? [-slot.height / 2, slot.height / 2 + 0.7] : [-slot.height / 2 - 0.7, slot.height / 2]
    if (!(Math.abs(across) <= slot.width / 2 && up >= low && up <= high)) {
      continue
    }
    nearest = slot
    nearestDistance = distance
  }
  return nearest
}

/** The point on the wall where a new slot would go, for a ray from the eye. */
export function slotTarget(origin: Vec3, direction: Vec3) {
  const target = placement.findPlacement(origin, direction, 0, 0, [])
  const wall = target && placement.wall(target.wallId)
  if (!target || !wall || wall.hangable === false || wall.curveRadius) {
    return null
  }
  return {
    ...target,
    // Snapped onto the hanging plane, in case the ray stopped at glass in front of the wall.
    position: wallPosition(wall, (target.position[0] - wall.center[0]) * Math.cos(wall.rotation) - (target.position[2] - wall.center[2]) * Math.sin(wall.rotation), target.position[1]),
  }
}

/** the next larger or smaller of the slot sizes from the one closest to `size`, wrapping around */
function nextSize(size: number, step: -1 | 1) {
  const nearest = slotSizes.reduce((best, candidate, index) => (Math.abs(candidate - size) < Math.abs(slotSizes[best] - size) ? index : best), 0)
  return slotSizes[(nearest + step + slotSizes.length) % slotSizes.length]
}
/** A slot of this ratio whose longer edge is `size`, at the same center. */
function resized(slot: PortraitSlot, ratio: PortraitRatio, size: number): PortraitSlot {
  return {
    ...slot,
    ratio,
    ...slotFrame(ratio, size),
  }
}
function replace(id: string, change: (slot: PortraitSlot) => PortraitSlot) {
  usePortraitSlots.setState(state => {
    const slots = state.slots.map(slot => (slot.id === id ? change(slot) : slot))
    const edited = slots.find(slot => slot.id === id)
    return {
      slots,
      template: edited ? [edited.ratio, longerEdge(edited)] : state.template,
    }
  })
}
