/** GPU families, as Chromium names them in `GPUAdapterInfo.architecture`, that `?graphics=auto` trusts with heavy graphics */
export const heavyArchitectures: ReadonlySet<string> = new Set(['blackwell', 'lovelace', 'rdna-4'])
/** the least `navigator.deviceMemory` in gigabytes, which Chromium reports up to 8, that `?graphics=auto` trusts with heavy graphics */
export const heavyDeviceMemory = 8

/** Whether `?graphics=auto` picks heavy graphics for this GPU family and device memory. Browsers that report either of them not at all, like Firefox and Safari, get fast graphics. */
export function isHeavyCapable(architecture: string | undefined, deviceMemory: number | undefined) {
  return architecture !== undefined && heavyArchitectures.has(architecture) && deviceMemory !== undefined && deviceMemory >= heavyDeviceMemory
}

/** Ask the adapter that three is going to request, without a power preference too, whether `?graphics=auto` picks heavy graphics. */
export async function detectHeavyCapability() {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return false
  }
  const {deviceMemory} = navigator as Navigator & {deviceMemory?: number}
  const adapter = await navigator.gpu.requestAdapter()
  return isHeavyCapable(adapter?.info.architecture, deviceMemory)
}
