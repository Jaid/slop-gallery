import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import type {Attributes} from 'victoria-browser-client'

import {readAdapter} from '../rendering/autoGraphics.ts'

type Brand = {
  brand: string
  version: string
}
/** the parts of `navigator.userAgentData` that lib.dom doesn’t know yet */
type UserAgentData = {
  brands: ReadonlyArray<Brand>
  getHighEntropyValues: (hints: Array<string>) => Promise<{
    architecture?: string
    bitness?: string
    fullVersionList?: ReadonlyArray<Brand>
    platformVersion?: string
  }>
  mobile: boolean
  platform: string
}
type EnvironmentNavigator = Navigator & {
  cpuPerformance?: number
  deviceMemory?: number
  userAgentData?: UserAgentData
}

/** the made-up brands Chromium mixes into its list, like “Not.A/Brand” */
const greaseBrand = /not.a.brand/iu
/** The browser among the brands: the product, like “Google Chrome”, ahead of the engine “Chromium” it names too. */
const pickBrand = (brands: ReadonlyArray<Brand> = []) => {
  const real = brands.filter(({brand}) => !greaseBrand.test(brand))
  return real.find(({brand}) => brand !== 'Chromium') ?? real.at(0)
}
const matches = (query: string) => typeof matchMedia === 'function' && matchMedia(query).matches
const colorGamut = () => ['rec2020', 'p3', 'srgb'].find(gamut => matches(`(color-gamut: ${gamut})`)) ?? 'unknown'
/** Leaves out what the browser didn’t report, as an empty string or undefined. */
const reported = (attributes: Record<string, boolean | number | string | undefined>) => Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== undefined && value !== '')) as Attributes

/** What the page runs on: the GPU’s adapter, the display, the CPU and memory, and the browser and OS, without anything that tells who the player is. */
export async function describeEnvironment(gpuAdapter: Promise<GPUAdapter | null> = readAdapter()): Promise<Attributes> {
  const browserNavigator = navigator as EnvironmentNavigator
  const userAgent = browserNavigator.userAgentData
  const [adapter, details] = await Promise.all([
    gpuAdapter,
    userAgent?.getHighEntropyValues(['architecture', 'bitness', 'fullVersionList', 'platformVersion']).catch(() => {}),
  ])
  // Older browsers lack some of the adapter’s info, like isFallbackAdapter.
  const info = adapter?.info as Partial<GPUAdapterInfo> | undefined
  const brand = pickBrand(details?.fullVersionList) ?? pickBrand(userAgent?.brands)
  return reported({
    'gpu.vendor': info?.vendor,
    'gpu.architecture': info?.architecture,
    'gpu.device': info?.device,
    'gpu.description': info?.description,
    'gpu.fallback': info?.isFallbackAdapter,
    'gpu.timestamp_query': adapter?.features.has('timestamp-query'),
    'gpu.max_texture_dimension_2d': adapter?.limits.maxTextureDimension2D,
    'display.pixel_ratio': devicePixelRatio,
    'display.color_gamut': colorGamut(),
    'display.hdr': matches('(dynamic-range: high)'),
    'screen.width': screen.width,
    'screen.height': screen.height,
    'viewport.width': innerWidth,
    'viewport.height': innerHeight,
    'host.cpu.cores': browserNavigator.hardwareConcurrency,
    'host.cpu.performance': browserNavigator.cpuPerformance,
    'host.memory_gb': browserNavigator.deviceMemory,
    'host.arch': details?.architecture && details.bitness ? `${details.architecture}-${details.bitness}` : details?.architecture,
    'browser.name': brand?.brand,
    'browser.version': brand?.version,
    'browser.mobile': userAgent?.mobile,
    'os.name': userAgent?.platform,
    'os.version': details?.platformVersion,
  })
}

let environment: Promise<Attributes> | undefined

/** Log what the page runs on as `gallery.environment`, described once per page and logged on every attachment, like the permalink. */
export default async function recordEnvironment(telemetry: SlopGalleryTelemetry) {
  environment ??= describeEnvironment()
  const attributes = await environment
  const browser = [attributes['browser.name'], attributes['browser.version']].filter(Boolean).join(' ') || 'an unknown browser'
  const gpu = attributes['gpu.description'] ?? ([attributes['gpu.vendor'], attributes['gpu.architecture']].filter(Boolean).join(' ') || 'an unknown GPU')
  telemetry.event('environment', attributes, `Environment: ${browser} on ${attributes['os.name'] ?? 'an unknown OS'} with ${gpu}`)
}
