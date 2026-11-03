/** the origin of OpenRouter’s own API */
export const openRouterOrigin = 'https://openrouter.ai'

/** where requests to OpenRouter’s API go and how they authenticate */
export type OpenRouterAccess = {
  /** the API key; `false` sends every request without one, for a host that adds its own, like an OpenRouter proxy, and an empty string means there is no access at all */
  key: false | string
  /** the origin serving OpenRouter’s API under `/api/`, OpenRouter’s own unless given, like that of a proxy or another server speaking the same API */
  origin?: string
}

/** whether requests can go out with `access`: with a key, or without one to a host that adds its own */
export function hasAccess(access: OpenRouterAccess) {
  return access.key !== ''
}
