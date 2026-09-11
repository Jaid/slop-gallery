import type {WebmcpBridge} from './tools.ts'

import createWebmcpTools from './tools.ts'

/** Each mount owns its registration signal, including partially completed async registrations. */
export default async function registerWebmcp(getBridge: () => WebmcpBridge, signal: AbortSignal, modelContext = typeof document === 'undefined' ? undefined : document.modelContext) {
  if (!modelContext || signal.aborted) {
    return () => {}
  }
  const controller = new AbortController
  const abort = () => controller.abort(signal.reason)
  signal.addEventListener('abort', abort, {once: true})
  const cleanup = () => {
    signal.removeEventListener('abort', abort)
    controller.abort()
  }
  try {
    for (const tool of createWebmcpTools(getBridge)) {
      controller.signal.throwIfAborted()
      await modelContext.registerTool(tool, {signal: controller.signal})
    }
    controller.signal.throwIfAborted()
    return cleanup
  } catch (error) {
    cleanup()
    throw error
  }
}
