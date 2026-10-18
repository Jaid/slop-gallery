import {readAiSettings} from './ai/settings.ts'
import {readIntroNarration} from './audio/intro.ts'
import {readCrosshair} from './crosshair.ts'
import {readDevelopmentMode} from './developmentMode.ts'
import {readSeedOverride} from './environmentSeed.ts'
import {readAntiAliasing} from './rendering/antiAliasing.ts'
import {readGraphicsMode} from './rendering/graphicsMode.ts'
import {readScale} from './rendering/scale.ts'
import {readVisionMode} from './rendering/visionMode.ts'

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
  crosshair: readCrosshair,
  development: readDevelopmentMode,
  graphics: readGraphicsMode,
  intro_narration: readIntroNarration,
  scale: readScale,
  seed: readSeedOverride,
  vision_mode: readVisionMode,
  telemetry: input => searchParameter('telemetry')(input) === 'true',
  logs_ingestion_endpoint: searchParameter('logs_ingestion_endpoint'),
  metrics_ingestion_endpoint: searchParameter('metrics_ingestion_endpoint'),
  traces_ingestion_endpoint: searchParameter('traces_ingestion_endpoint'),
}

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
