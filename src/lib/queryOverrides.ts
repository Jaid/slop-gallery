import {readAiSettings} from './ai/settings.ts'
import {readShowAmbienceEmitters} from './audio/ambience/ambienceEmitters.ts'
import {readAudio} from './audio/audioParameter.ts'
import {readIntroNarration} from './audio/intro.ts'
import {readCrosshair} from './crosshair.ts'
import {readDevelopmentMode} from './developmentMode.ts'
import {readSeedOverride} from './environmentSeed.ts'
import {readFrozenTime} from './frozenTime.ts'
import {readRoom, readSpawn} from './gallery/bookmarks.ts'
import {readPortraitSet} from './gallery/defaultPortraits.ts'
import {readFlying} from './gallery/flyMode.ts'
import {readWeather} from './gallery/lighting.ts'
import {readPortraitSlotEditing, readShowPortraitSlots} from './gallery/portraitSlotStore.ts'
import {readKnotRotation} from './physics/rotatingKnots.ts'
import {readAntiAliasing} from './rendering/antiAliasing.ts'
import {readGraphicsModeName} from './rendering/graphicsMode.ts'
import {readEditLights, readShowLights} from './rendering/lightLevels.ts'
import {readLoading} from './rendering/loading.ts'
import {readNear} from './rendering/near.ts'
import {readPmrem} from './rendering/pmrem.ts'
import {readScale} from './rendering/scale.ts'
import {readShowWireframe} from './rendering/showWireframe.ts'
import {readWireframeHighlight} from './rendering/wireframeHighlight.ts'
import {readTemporary} from './temporary.ts'

type Reader = (input: string) => unknown

// read-permalink resolves relative input against the current page, so defaults need an absolute URL without parameters.
const defaultsUrl = 'http://localhost/'
const searchParameters = (input: string) => {
  const url = new URL(input, defaultsUrl)
  return url.searchParams
}
const searchParameter = (key: string): Reader => input => searchParameters(input).get(key) ?? undefined
const readers: Record<string, Reader> = {
  ...Object.fromEntries(Object.keys(readAiSettings(defaultsUrl)).map(key => [key, (input: string) => readAiSettings(input)[key as keyof ReturnType<typeof readAiSettings>]])),
  anti_aliasing: readAntiAliasing,
  audio: readAudio,
  crosshair: readCrosshair,
  development: readDevelopmentMode,
  edit_lights: readEditLights,
  edit_portrait_slots: readPortraitSlotEditing,
  flying: readFlying,
  frozen_time: readFrozenTime,
  graphics: readGraphicsModeName,
  intro_narration: readIntroNarration,
  knot_rotation: readKnotRotation,
  loading: readLoading,
  near: readNear,
  pmrem: readPmrem,
  portrait_set: readPortraitSet,
  room: readRoom,
  scale: readScale,
  seed: readSeedOverride,
  show_ambience_emitters: readShowAmbienceEmitters,
  show_lights: readShowLights,
  show_portrait_slots: readShowPortraitSlots,
  show_wireframe: readShowWireframe,
  spawn: readSpawn,
  temporary: readTemporary,
  weather: readWeather,
  wireframe_highlight: readWireframeHighlight,
  telemetry: input => searchParameter('telemetry')(input) === 'true',
  logs_ingestion_endpoint: searchParameter('logs_ingestion_endpoint'),
  metrics_ingestion_endpoint: searchParameter('metrics_ingestion_endpoint'),
  traces_ingestion_endpoint: searchParameter('traces_ingestion_endpoint'),
}

/** Every query parameter the app reads, apart from the `data` permalink payload. */
export const queryParameters = Object.keys(readers)

/** Query parameters of the page that differ from their defaults: known parameters as the app normalizes them, unknown ones as given. `undefined` when everything is at its default. */
export default function readQueryOverrides(href = typeof location === 'undefined' ? defaultsUrl : location.href): Record<string, boolean | number | string> | undefined {
  const overrides: Record<string, boolean | number | string> = {}
  for (const [key, read] of Object.entries(readers)) {
    const value = read(href)
    if (value !== undefined && !Object.is(value, read(defaultsUrl))) {
      overrides[key] = value as boolean | number | string
    }
  }
  // `data` carries an encoded permalink payload whose fields the readers above already cover.
  for (const [key, value] of searchParameters(href)) {
    if (!(key in readers) && key !== 'data') {
      overrides[key] = value
    }
  }
  return Object.keys(overrides).length > 0 ? overrides : undefined
}
