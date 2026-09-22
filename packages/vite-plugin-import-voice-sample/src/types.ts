import type {
  ResolvedVoiceSampleRequest,
  VoiceSampleFormat,
  VoiceSampleStoreOptions,
  VoiceSampleTiming,
} from 'voice-sample-store'

export type VoiceSampleLoadType = 'contents' | 'reference'
export type VoiceSampleContents<Format extends VoiceSampleFormat> = Format extends 'timings' ? ReadonlyArray<VoiceSampleTiming> : Uint8Array
export type VoiceSampleValue<Format extends VoiceSampleFormat, Type extends VoiceSampleLoadType> = Type extends 'reference' ? string : VoiceSampleContents<Format>

export type VoiceSampleRequest = ResolvedVoiceSampleRequest & {
  type: VoiceSampleLoadType
}

export type VoiceSamplePluginOptions = Omit<VoiceSampleStoreOptions, 'defaults' | 'rootFolder'> & {
  /** Defaults used when the matching import attribute/path component is omitted. */
  defaults?: Partial<Pick<VoiceSampleRequest, 'format' | 'language' | 'type' | 'voice'>>
}
