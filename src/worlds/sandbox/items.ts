import optis from 'optis'
import readPermalink from 'read-permalink'

/** The ids in a `?item` value, comma-separated in the query or listed in the packed permalink state: trimmed, in their order, without empty ones or repeats. */
function parseItems(value: unknown): ReadonlyArray<string> {
  const values: ReadonlyArray<unknown> = Array.isArray(value) ? value : [value]
  const ids = values.flatMap(entry => (typeof entry === 'string' ? entry.split(',') : [])).map(id => id.trim()).filter(Boolean)
  return [...new Set(ids)]
}
const itemSchema = optis({
  defaults: {
    item: [] as ReadonlyArray<string>,
  },
  normalizations: {
    item: parseItems,
  },
})

/** Read the object ids of the items `?item` puts on pedestals in the Sandbox, like `prop-orb-halloween`, comma-separated and in their order; none by default. */
export function readItems(input: URL | string = typeof location === 'undefined' ? '' : location.href): ReadonlyArray<string> {
  return readPermalink(input, {schema: itemSchema}).item
}
