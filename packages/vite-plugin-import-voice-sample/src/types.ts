import type {
  ResolvedVoiceSampleRequest,
  VoiceSampleFormat,
  VoiceSampleStoreOptions,
  VoiceSampleTiming,
} from 'voice-sample-store'

export type VoiceSampleLoadType = 'contents' | 'reference'
export type VoiceSampleContents<Format extends VoiceSampleFormat> = Format extends 'timings' ? ReadonlyArray<VoiceSampleTiming> : Uint8Array
/** `undefined` for samples left out, as every sample is with `enabled: false` and a sample that cannot be fetched is with `optional: true`. */
export type VoiceSampleValue<Format extends VoiceSampleFormat, Type extends VoiceSampleLoadType> = (Type extends 'reference' ? string : VoiceSampleContents<Format>) | undefined

export type VoiceSampleRequest = ResolvedVoiceSampleRequest & {
  type: VoiceSampleLoadType
}

export type VoiceSamplePluginOptions = Omit<VoiceSampleStoreOptions, 'defaults' | 'rootFolder'> & {
  /** Defaults used when the matching import attribute/path component is omitted. */
  defaults?: Partial<Pick<VoiceSampleRequest, 'format' | 'language' | 'type' | 'voice'>>
  /** If false, no voice sample is prepared or fetched: every voice import resolves to `undefined`. Defaults to true. */
  enabled?: boolean
  /** If true, a voice sample that cannot be fetched resolves to `undefined` with a warning instead of failing the build. Defaults to false. */
  optional?: boolean
}
