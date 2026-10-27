import type {Page} from 'puppeteer-core'

/** Runs one of the app’s WebMCP tools in a page once the app has registered it, and resolves with its parsed JSON result. The browser needs `--enable-features=WebMCP`. */
export const callWebmcpTool = async (page: Page, name: string, input: Record<string, unknown> = {}) => {
  await page.waitForFunction(async (tool: string) => {
    const tools = await document.modelContext?.getTools()
    return Boolean(tools?.some(candidate => candidate.name === tool))
  }, {timeout: 60_000}, name)
  const result = await page.evaluate(async (tool: string, toolInput: Record<string, unknown>) => {
    const context = document.modelContext!
    const tools = await context.getTools()
    const registered = tools.find(candidate => candidate.name === tool)!
    return context.executeTool(registered, toolInput)
  }, name, input)
  return JSON.parse(result) as unknown
}

/** Polls the app’s `get_loading_items` tool until nothing is left loading, so the next frame shows everything in place. */
export const waitForLoadingItems = async (page: Page, timeout = 120_000) => {
  const deadline = Date.now() + timeout
  for (;;) {
    const items = await callWebmcpTool(page, 'get_loading_items') as Array<string>
    if (!items.length) {
      return
    }
    if (Date.now() > deadline) {
      throw new Error(`Still loading after ${timeout / 1000} s: ${items.join(', ')}.`)
    }
    await new Promise(resolve => setTimeout(resolve, 20))
  }
}

/** Changes the wireframe flood through the `set_wireframe` tool, with its snake_case input, and resolves with the whole flood now in effect. */
export const setWireframe = (page: Page, input: Record<string, unknown>) => callWebmcpTool(page, 'set_wireframe', input) as Promise<Record<string, unknown>>
