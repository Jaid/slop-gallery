import type {SkyPalette} from '../materials/ProceduralSky.ts'
import type {Vec3} from './types.ts'

import optis from 'optis'
import readPermalink from 'read-permalink'
import {create} from 'zustand'

import {isDevelopmentMode} from '../developmentMode.ts'
import {daytimeSky} from '../materials/ProceduralSky.ts'
import sun, {sunDirectionFromAngles, sunGeometry} from './sun.ts'

export type LightingPreset = {
  ambient: Light
  /** the reflection environment: a vertical gradient from top to bottom, with bright light boxes in its upper band */
  environment: {
    gradient: readonly [string, string, string, string]
    intensity: number
    lightBoxes: string
  }
  /** the renderer’s tone mapping exposure */
  exposure: number
  hemisphere: Light & {ground: string}
  /** multiplies every point and spot light, the rooms’ own lamps */
  lamps: number
  sky: SkyPalette
  /** the sky’s light falling through skylights */
  skylight: Light
  /** the directional light: the sun, or the moon at night */
  sun: Light & {direction: Vec3}
  /** shown when switching to it */
  title: string
}

type Light = {
  color: string
  intensity: number
}

const presets = {
  noon: {
    title: 'Noon',
    // Hardly any flat fill: the rooms are lit by their own lamps, so surfaces fall off into shade between them.
    ambient: {
      color: '#ffffff',
      intensity: 0,
    },
    hemisphere: {
      color: '#ecf3ff',
      ground: '#a29270',
      intensity: 1,
    },
    sun: {
      color: '#fff0d7',
      intensity: 6,
      direction: sun.direction,
    },
    environment: {
      gradient: ['#e6eeed', '#b6bcac', '#7d816c', '#4b4c3d'],
      intensity: 0.2,
      lightBoxes: '#fff9e6',
    },
    sky: daytimeSky,
    skylight: {
      color: '#dfe9f5',
      intensity: 1.6,
    },
    exposure: 1,
    lamps: 1,
  },
  golden_hour: {
    title: 'Golden hour',
    ambient: {
      color: '#ffe4c8',
      intensity: 0.12,
    },
    hemisphere: {
      color: '#ffd9b0',
      ground: '#6e5440',
      intensity: 0.5,
    },
    sun: {
      color: '#ffb36b',
      intensity: 2.8,
      direction: [-8, 2.8, 3],
    },
    environment: {
      gradient: ['#ffd6a8', '#d29a6c', '#7a5a44', '#3e2f25'],
      intensity: 0.3,
      lightBoxes: '#ffe2b8',
    },
    sky: {
      brightness: 0.85,
      cloudCover: 0.35,
      cloudLit: '#ffd2a0',
      cloudShade: '#8a7280',
      cloudWarm: '#ffb070',
      glow: '#ffb070',
      ground: '#a88b6e',
      horizon: '#ffc58a',
      sun: '#ffd08a',
      sunRadiance: 30,
      zenith: '#4a6fa8',
    },
    skylight: {
      color: '#ffc890',
      intensity: 1,
    },
    exposure: 1,
    lamps: 1.4,
  },
  dusk: {
    title: 'Dusk',
    ambient: {
      color: '#b8c0ff',
      intensity: 0.25,
    },
    hemisphere: {
      color: '#6d7fc2',
      ground: '#3a3040',
      intensity: 0.6,
    },
    sun: {
      color: '#ff8a5c',
      intensity: 0.5,
      direction: [-8, 0.9, 3],
    },
    environment: {
      gradient: ['#5a6aa0', '#3c4470', '#262838', '#141418'],
      intensity: 0.35,
      lightBoxes: '#ffd9b0',
    },
    sky: {
      brightness: 0.7,
      cloudCover: 0.3,
      cloudLit: '#c2768a',
      cloudShade: '#3a3456',
      cloudWarm: '#ff8a5c',
      glow: '#ff7a4a',
      ground: '#3a3340',
      horizon: '#f08a5d',
      sun: '#ff9a60',
      sunRadiance: 12,
      zenith: '#1d2a5c',
    },
    skylight: {
      color: '#8a90c8',
      intensity: 0.35,
    },
    exposure: 1.1,
    lamps: 1.3,
  },
  night: {
    title: 'Night',
    ambient: {
      color: '#8da2d6',
      intensity: 0.08,
    },
    hemisphere: {
      color: '#2a3a66',
      ground: '#15120f',
      intensity: 0.25,
    },
    sun: {
      color: '#a8c4ff',
      intensity: 0.35,
      direction: [5, 7, -4],
    },
    environment: {
      gradient: ['#1a2238', '#10141f', '#0a0b10', '#050506'],
      intensity: 0.25,
      lightBoxes: '#ffe2b0',
    },
    sky: {
      brightness: 1,
      cloudCover: 0.25,
      cloudLit: '#3a4560',
      cloudShade: '#10131c',
      cloudWarm: '#000000',
      glow: '#6b85c0',
      ground: '#0d0d12',
      horizon: '#1a2440',
      sun: '#dfe8ff',
      sunRadiance: 6,
      zenith: '#050a1a',
    },
    skylight: {
      color: '#6f86c0',
      intensity: 0.12,
    },
    exposure: 1.15,
    lamps: 1.5,
  },
} as const satisfies Record<string, LightingPreset>

export type LightingPresetId = keyof typeof presets

export const lightingPresetIds = Object.keys(presets) as Array<LightingPresetId>

/** which lamps glow: all of them, or only the essential ones, leaving out the lights marked `optional` */
export type LampSet = 'all' | 'essential'

/** a preset with the position and shadow frustum its sun direction needs */
export type GalleryLightingPreset = LightingPreset & {
  /** all lamps unless the tuning panel says otherwise */
  lampSet?: LampSet
  sun: LightingPreset['sun'] & ReturnType<typeof sunGeometry>
}

/** Every preset with the shadow frustum its sun direction needs. */
export const lightingPresets = Object.fromEntries(Object.entries(presets).map(([id, preset]) => [id, {
  ...preset,
  sun: {
    ...preset.sun,
    ...sunGeometry(preset.sun.direction),
  },
}])) as {[Id in LightingPresetId]: typeof presets[Id] & {sun: ReturnType<typeof sunGeometry>}}

const lightingSchema = optis({
  defaults: {
    lighting: 'noon',
  },
  normalizations: {
    lighting(value: unknown) {
      return lightingPresetIds.find(id => id === value) ?? 'noon'
    },
  },
})

/** The lighting values the tuning panel of `?development` changes. The sun’s azimuth runs clockwise from north (−z) and its elevation up from the horizon, both in degrees. */
export type LightingTuning = {
  environmentIntensity: number
  hemisphereIntensity: number
  lamps: number
  lampSet: LampSet
  /** whether the sun shines at all */
  sun: boolean
  sunAzimuth: number
  sunElevation: number
  sunIntensity: number
}

const degrees = 180 / Math.PI

/** A preset’s own values for the tuning panel. */
export function getLightingTuning(preset: LightingPreset): LightingTuning {
  const [x, y, z] = preset.sun.direction
  return {
    environmentIntensity: preset.environment.intensity,
    hemisphereIntensity: preset.hemisphere.intensity,
    lamps: preset.lamps,
    lampSet: 'all',
    sun: true,
    sunAzimuth: (Math.atan2(x, -z) * degrees + 360) % 360,
    sunElevation: Math.atan2(y, Math.hypot(x, z)) * degrees,
    sunIntensity: preset.sun.intensity,
  }
}

/** Picks the lighting values out of the tuning panel’s. */
export function pickLightingTuning(tuning: LightingTuning): LightingTuning {
  return {
    environmentIntensity: tuning.environmentIntensity,
    hemisphereIntensity: tuning.hemisphereIntensity,
    lamps: tuning.lamps,
    lampSet: tuning.lampSet,
    sun: tuning.sun,
    sunAzimuth: tuning.sunAzimuth,
    sunElevation: tuning.sunElevation,
    sunIntensity: tuning.sunIntensity,
  }
}

/** Applies the tuning panel’s lighting to a preset. Every value still at `start`, the one the panel opened with, keeps following the preset, so cycling presets with L still changes it. */
export function tuneLighting(preset: GalleryLightingPreset, tuning: LightingTuning, start: LightingTuning): GalleryLightingPreset {
  const own = getLightingTuning(preset)
  const pick = (key: 'environmentIntensity' | 'hemisphereIntensity' | 'lamps' | 'sunAzimuth' | 'sunElevation' | 'sunIntensity') => (tuning[key] === start[key] ? own[key] : tuning[key])
  const isMoved = pick('sunAzimuth') !== own.sunAzimuth || pick('sunElevation') !== own.sunElevation
  return {
    ...preset,
    environment: {
      ...preset.environment,
      intensity: pick('environmentIntensity'),
    },
    hemisphere: {
      ...preset.hemisphere,
      intensity: pick('hemisphereIntensity'),
    },
    lamps: pick('lamps'),
    lampSet: tuning.lampSet,
    sun: {
      ...preset.sun,
      ...isMoved ? sunGeometry(sunDirectionFromAngles(pick('sunAzimuth'), pick('sunElevation'))) : {},
      intensity: tuning.sun ? pick('sunIntensity') : 0,
    },
  }
}

/** Read the `?lighting` preset the gallery starts with. */
export function readLighting(input: URL | string = typeof location === 'undefined' ? '' : location.href): LightingPresetId {
  return readPermalink(input, {schema: lightingSchema}).lighting
}

/** The gallery’s current lighting preset. With `?development`, it starts from `?lighting` and L cycles it for the rest of the page session; otherwise it stays at Noon. */
export const useLighting = create<{preset: LightingPresetId}>(() => ({preset: isDevelopmentMode ? readLighting() : 'noon'}))

/** Switches to the next (or with a negative `step`, previous) preset and returns it. */
export function cycleLighting(step = 1) {
  const index = lightingPresetIds.indexOf(useLighting.getState().preset)
  const preset = lightingPresetIds[(index + step + lightingPresetIds.length) % lightingPresetIds.length]
  useLighting.setState({preset})
  return lightingPresets[preset]
}
