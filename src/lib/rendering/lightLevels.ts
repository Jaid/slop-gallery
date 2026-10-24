import type {Light, LightShadow, Object3D} from 'three/webgpu'

import optis from 'optis'
import readPermalink from 'read-permalink'
import {Vector3} from 'three/webgpu'
import {create} from 'zustand'

type Level = {
  /** the intensity the light’s owner gave it */
  base: number
  /** what {@link applyLightLevels} last turned it into */
  written: number
}

const enabledValues = new Set<unknown>([true, '', 'true'])
const flagsSchema = optis({
  defaults: {
    edit_lights: false,
    show_lights: false,
  },
  normalizations: {
    edit_lights(value: unknown) {
      return enabledValues.has(value)
    },
    show_lights(value: unknown) {
      return enabledValues.has(value)
    },
  },
})

/** Read the `?show_lights` flag that marks every light in the scene; a bare `?show_lights` counts as enabled. */
export function readShowLights(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: flagsSchema}).show_lights
}

/** Read the `?edit_lights` flag that lets E switch the aimed light off and on, the arrows change its strength and range and Numpad 7 and 1 its decay; a bare `?edit_lights` counts as enabled. */
export function readEditLights(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: flagsSchema}).edit_lights
}

/** whether this page was opened with `?edit_lights`, read once at startup */
export const isEditingLights = readEditLights()

/** whether this page shows light markers, read once at startup; editing shows them too */
export const isShowingLights = isEditingLights || readShowLights()

/** how much one step changes a light’s range, in meters */
const rangeStep = 1
/** Adds `steps` steps of `size` to `value`, landing on whole steps and no lower than `min`. */
const stepBy = (value: number, steps: number, size: number, min: number) => Math.max(min, Number(((Math.round(value / size) + steps) * size).toFixed(6)))
/** the range a light without a cutoff starts from when its range is first changed, in meters */
const openRange = 20
/** each light’s intensity as its owner set it, and as {@link applyLightLevels} last wrote it */
const levels = new WeakMap<Light, Level>

/** The light the camera aims at while editing lights, the one focused by clicking its marker, the lights moved, the lights whose range or decay changed, and the lights switched off or made stronger or weaker for this page session. */
export const useLightEdits = create<{
  aimed: Light | null
  focused: Light | null
  moved: ReadonlySet<Light>
  off: ReadonlySet<Light>
  reshaped: ReadonlySet<Light>
  strengths: ReadonlyMap<Light, number>
}>(() => ({
  aimed: null,
  focused: null,
  moved: new Set,
  off: new Set,
  reshaped: new Set,
  strengths: new Map,
}))

const markReshaped = (light: Light) => {
  const {reshaped} = useLightEdits.getState()
  if (!reshaped.has(light)) {
    const next = new Set(reshaped)
    next.add(light)
    useLightEdits.setState({reshaped: next})
  }
}

/**
 * Makes a light stronger (positive `steps`) or weaker by whole units of intensity, the unit its owner sets it in, returning its new intensity before any lamp gain.
 * A light its owner left dark has nothing to scale, so it returns undefined.
 */
export function changeLightIntensity(light: Light, steps: number) {
  const base = levels.get(light)?.base ?? light.intensity
  if (base <= 0) {
    return
  }
  const strengths = new Map(useLightEdits.getState().strengths)
  const intensity = Math.max(0, Math.round(base * (strengths.get(light) ?? 1)) + steps)
  strengths.set(light, intensity / base)
  useLightEdits.setState({strengths})
  return intensity
}

/** the ranges lights had before they were first changed */
const ranges = new WeakMap<Light, number>

/** Lets a point or spot light reach farther (positive `steps`) or less far, returning its new range in meters. */
export function changeLightRange(light: Light & {distance?: number}, steps: number) {
  if (light.distance === undefined) {
    return
  }
  if (!ranges.has(light)) {
    ranges.set(light, light.distance)
  }
  light.distance = stepBy(light.distance || openRange, steps, rangeStep, rangeStep)
  markReshaped(light)
  return light.distance
}

/** how much one step changes a light’s decay */
const decayStep = 0.25
/** the decays lights had before they were first changed */
const decays = new WeakMap<Light, number>

/** Makes a point or spot light fade faster with distance (positive `steps`) or more gently, returning its new decay. */
export function changeLightDecay(light: Light & {decay?: number}, steps: number) {
  if (light.decay === undefined) {
    return
  }
  if (!decays.has(light)) {
    decays.set(light, light.decay)
  }
  light.decay = Math.max(0, Math.round((light.decay + steps * decayStep) / decayStep) * decayStep)
  markReshaped(light)
  return light.decay
}

const moving = new Vector3
/** where moved lights were placed by their owners, in their parents’ space */
const origins = new WeakMap<Light, Vector3>
/** Puts a light at a world position, returning that position. */
export function placeLight(light: Light, world: Vector3) {
  if (!origins.has(light)) {
    origins.set(light, light.position.clone())
  }
  moving.copy(world)
  light.position.copy(light.parent ? light.parent.worldToLocal(moving) : moving)
  light.updateMatrixWorld()
  const moved = new Set(useLightEdits.getState().moved)
  if (!moved.has(light)) {
    moved.add(light)
    useLightEdits.setState({moved})
  }
  return world.clone()
}

/** Moves a light by a world-space offset, returning its new world position. */
export function moveLight(light: Light, offset: Vector3) {
  return placeLight(light, light.getWorldPosition(new Vector3).add(offset))
}

/** Undoes every edit to a light: puts it back where its owner placed it, with its range, decay, strength and on, returning its world position. */
export function resetLight(light: Light & {
  decay?: number
  distance?: number
}) {
  const origin = origins.get(light)
  if (origin) {
    light.position.copy(origin)
    light.updateMatrixWorld()
    origins.delete(light)
  }
  const range = ranges.get(light)
  if (range !== undefined) {
    light.distance = range
    ranges.delete(light)
  }
  const decay = decays.get(light)
  if (decay !== undefined) {
    light.decay = decay
    decays.delete(light)
  }
  const {moved, off, reshaped, strengths} = useLightEdits.getState()
  const without = <Value>(set: ReadonlySet<Value>) => new Set([...set].filter(entry => entry !== light))
  useLightEdits.setState({
    moved: without(moved),
    off: without(off),
    reshaped: without(reshaped),
    strengths: new Map([...strengths].filter(([entry]) => entry !== light)),
  })
  return light.getWorldPosition(new Vector3)
}

/** Switches a light off or back on, returning whether it is on now. */
export function toggleLight(light: Light) {
  const off = new Set(useLightEdits.getState().off)
  const on = off.has(light)
  if (on) {
    off.delete(light)
  } else {
    off.add(light)
  }
  useLightEdits.setState({off})
  return on
}

/**
 * Multiplies the intensity of every light, on top of what its owner sets, such as a lighting preset’s lamp gain. Levels replace
 * it while mounted. Strengths changed with {@link changeLightIntensity} apply on top, and a light switched off with {@link toggleLight} gets 0 regardless.
 */
export const lightGain = {current: (_light: Light) => 1}

/**
 * Whether each light’s surroundings let it shine, such as the room the player is in; a light this rules out gets 0 like one switched off. Levels replace it while mounted.
 */
export const lightActive = {current: (_light: Light) => true}

/**
 * How dark each light’s shadow falls, where 0 stops it from casting one at all. Applies only to lights whose owner made them cast shadows. Levels replace it while mounted.
 */
export const lightShadow = {current: (_light: Light) => 1}

/** whether each light’s owner made it cast shadows, and whether this made it last frame */
const casters = new WeakMap<Light, {
  base: boolean
  written: boolean
}>

/**
 * Scales every light by {@link lightGain}, switches off the ones toggled off and weakens or drops shadows by {@link lightShadow}. Call it once per frame after everything else
 * set its lights, so lights that flicker or dim are scaled after their owner set them for this frame. An intensity that differs
 * from what this wrote last frame is a new one from the light’s owner.
 */
export function applyLightLevels(scene: Object3D) {
  const {off, strengths} = useLightEdits.getState()
  scene.traverse(object => {
    const light = object as Light
    if (!light.isLight) {
      return
    }
    let level = levels.get(light)
    if (light.intensity !== level?.written) {
      level = {
        base: light.intensity,
        written: Number.NaN,
      }
      levels.set(light, level)
    }
    light.intensity = off.has(light) || !lightActive.current(light) ? 0 : level.base * lightGain.current(light) * (strengths.get(light) ?? 1)
    level.written = light.intensity
    let caster = casters.get(light)
    if (light.castShadow !== caster?.written) {
      caster = {
        base: light.castShadow,
        written: light.castShadow,
      }
      casters.set(light, caster)
    }
    const {shadow} = light as Light & {shadow?: LightShadow}
    if (caster.base && shadow) {
      const strength = lightShadow.current(light)
      light.castShadow = strength > 0
      shadow.intensity = strength
    }
    caster.written = light.castShadow
  })
}
