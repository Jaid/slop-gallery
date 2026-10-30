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

/** Whether `?graphics=auto` picks heavy graphics for these hints. Browsers that report the GPU family or the device memory not at all, like Firefox and Safari, get fast graphics. */
export function isHeavyCapable({architecture, cpuPerformance, deviceMemory}: HeavyCapabilityHints) {
  if (architecture === undefined || !heavyArchitectures.has(architecture)) {
    return false
  }
  if (deviceMemory === undefined || deviceMemory < heavyDeviceMemory) {
    return false
  }
  return cpuPerformance === undefined || !weakCpuPerformanceTiers.has(cpuPerformance)
}

/** Ask the adapter that three is going to request, without a power preference too, whether `?graphics=auto` picks heavy graphics. */
export async function detectHeavyCapability() {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return false
  }
  const {cpuPerformance, deviceMemory} = navigator as Navigator & Pick<HeavyCapabilityHints, 'cpuPerformance' | 'deviceMemory'>
  const adapter = await navigator.gpu.requestAdapter()
  return isHeavyCapable({
    architecture: adapter?.info.architecture,
    cpuPerformance,
    deviceMemory,
  })
}
