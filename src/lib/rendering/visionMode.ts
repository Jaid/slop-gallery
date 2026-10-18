import optis from 'optis'
import readPermalink from 'read-permalink'

const visionModes = ['wireframe', 'portrait_slots'] as const

export type VisionMode = typeof visionModes[number]

const visionModeSchema = optis({
  normalizations: {
    vision_mode(value: unknown) {
      return visionModes.find(visionMode => visionMode === value)
    },
  },
})

/** Read an optional diagnostic vision mode that replaces the regular look of the scene or overlays it. */
export function readVisionMode(input: URL | string = typeof location === 'undefined' ? '' : location.href): VisionMode | undefined {
  return readPermalink(input, {schema: visionModeSchema}).vision_mode
}
