/** GPU families, as Chromium names them in `GPUAdapterInfo.architecture`, that `?graphics=auto` trusts with heavy graphics */
export const heavyArchitectures: ReadonlySet<string> = new Set(['blackwell', 'lovelace', 'rdna-4'])
/** the least `navigator.deviceMemory` in gigabytes that `?graphics=auto` trusts with heavy graphics */
export const heavyDeviceMemory = 8
/** `navigator.cpuPerformance` tiers that `?graphics=auto` keeps from heavy graphics; 0 (unknown) and browsers without the API don’t count against it */
export const weakCpuPerformanceTiers: ReadonlySet<number> = new Set([1, 2])

export type HeavyCapabilityHints = {
  /** `GPUAdapterInfo.architecture` of the adapter three is going to request */
  architecture?: string
  /** `navigator.cpuPerformance`, the CPU’s performance tier from 1 up, or 0 if unknown */
  cpuPerformance?: number
  /** `navigator.deviceMemory` in gigabytes */
  deviceMemory?: number
}

/** whether a hint meets what `?graphics=auto` asks of it for heavy graphics, or the browser didn’t report it */
export type HeavyCapabilityVerdict = 'met' | 'unknown' | 'unmet'

/** Judge each hint on its own. */
export function judgeHeavyCapability({architecture, cpuPerformance, deviceMemory}: HeavyCapabilityHints): Record<keyof HeavyCapabilityHints, HeavyCapabilityVerdict> {
  return {
    architecture: architecture ? (heavyArchitectures.has(architecture) ? 'met' : 'unmet') : 'unknown',
    cpuPerformance: cpuPerformance ? (weakCpuPerformanceTiers.has(cpuPerformance) ? 'unmet' : 'met') : 'unknown',
    deviceMemory: deviceMemory === undefined ? 'unknown' : (deviceMemory >= heavyDeviceMemory ? 'met' : 'unmet'),
  }
}

/** Whether `?graphics=auto` picks heavy graphics for these hints. The GPU family and the device memory must be reported, which Firefox and Safari don’t, while an unknown CPU tier doesn’t count against it. */
export function isHeavyCapable(hints: HeavyCapabilityHints) {
  const verdicts = judgeHeavyCapability(hints)
  return verdicts.architecture === 'met' && verdicts.deviceMemory === 'met' && verdicts.cpuPerformance !== 'unmet'
}

/** Ask the navigator, and the adapter that three is going to request without a power preference too, for the hints. */
export async function requestHeavyCapabilityHints(): Promise<HeavyCapabilityHints> {
  const {cpuPerformance, deviceMemory} = navigator as Navigator & Pick<HeavyCapabilityHints, 'cpuPerformance' | 'deviceMemory'>
  // A failed request only leaves the GPU family unknown; three reports a GPU that is really missing itself.
  const adapter = 'gpu' in navigator ? await navigator.gpu.requestAdapter().catch(() => null) : null
  return {
    architecture: adapter?.info.architecture,
    cpuPerformance,
    deviceMemory,
  }
}

let hints: Promise<HeavyCapabilityHints> | undefined

/** The hints of this page, requested on the first call only, so `?graphics=auto` and the menu share one adapter request. */
export function readHeavyCapabilityHints() {
  hints ??= requestHeavyCapabilityHints()
  return hints
}
