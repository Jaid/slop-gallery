import type {VoiceSampleFormat, VoiceSampleRequest} from './types.ts'

export type VoiceSampleDefaults = Pick<VoiceSampleRequest, 'format' | 'language' | 'voice'>

export type VoiceSampleEdit = {
  end: number
  start: number
  text: string
}

export type VoiceSampleImportKind = 'audio' | 'timings'

export type ParsedVoiceSampleImport = {
  edits: Array<VoiceSampleEdit>
  kind: VoiceSampleImportKind
  request: VoiceSampleRequest
}

export const voiceSampleSource = 'voice-sample'
export const voiceSampleSourcePrefix = `${voiceSampleSource}:`
export const voiceSampleTimingsSuffix = '/timings'
export const virtualVoiceSamplePrefix = 'virtual:voice-sample/'

type Position = {
  end: number
  start: number
}

type AstValue = Position & {
  name?: string
  type: string
  value?: unknown
}

type ImportAttribute = Position & {
  key?: AstValue
  type: string
  value?: AstValue
}

type ImportDeclaration = Position & {
  attributes?: Array<ImportAttribute>
  source?: AstValue
  specifiers?: Array<{type?: string}>
  type: string
}

type Program = {
  body?: Array<ImportDeclaration>
}

type AttributeName = 'emotion' | 'format' | 'language' | 'text' | 'voice'

const formats = new Set<VoiceSampleFormat>(['opus', 'pcm', 'wav'])
const allowedAttributes = new Set<string>(['emotion', 'format', 'language', 'text', 'voice'])
const stringValue = (value: AstValue | undefined) => {
  return typeof value?.value === 'string' ? value.value : undefined
}
const keyValue = (value: AstValue | undefined) => {
  return typeof value?.name === 'string' ? value.name : stringValue(value)
}
const isVoiceSampleFormat = (value: string): value is VoiceSampleFormat => formats.has(value as VoiceSampleFormat)
const attributesRecord = (node: ImportDeclaration) => {
  const result: Partial<Record<AttributeName, string>> = {}
  for (const attribute of node.attributes ?? []) {
    const key = keyValue(attribute.key)
    const value = stringValue(attribute.value)
    if (!key || value === undefined) {
      throw new Error('Voice sample import attributes must use string literal values.')
    }
    if (!allowedAttributes.has(key)) {
      throw new Error(`Unknown voice sample import attribute "${key}".`)
    }
    if (key in result) {
      throw new Error(`Duplicate voice sample import attribute "${key}".`)
    }
    result[key as AttributeName] = value
  }
  return result
}
const attributeClauseRange = (code: string, node: ImportDeclaration) => {
  const attributes = node.attributes ?? []
  if (!attributes.length || !node.source) {
    return
  }
  const first = attributes[0]
  const last = attributes.at(-1)!
  const before = code.slice(node.source.end, first.start)
  const withMatch = /\bwith\s*\{\s*$/u.exec(before)
  if (!withMatch) {
    throw new Error('Could not locate the voice sample import attribute clause.')
  }
  const close = code.indexOf('}', last.end)
  if (close === -1 || close >= node.end) {
    throw new Error('Could not locate the end of the voice sample import attribute clause.')
  }
  return {
    end: close + 1,
    start: node.source.end + withMatch.index,
  }
}

export const parseVoiceSampleImports = (code: string, ast: unknown, defaults: VoiceSampleDefaults): Array<ParsedVoiceSampleImport> => {
  const body = (ast as Program).body ?? []
  const imports: Array<ParsedVoiceSampleImport> = []
  for (const node of body) {
    const source = stringValue(node.source)
    const kind: VoiceSampleImportKind = source?.endsWith(voiceSampleTimingsSuffix) ? 'timings' : 'audio'
    const baseSource = kind === 'timings' ? source?.slice(0, -voiceSampleTimingsSuffix.length) : source
    const matchesSource = baseSource === voiceSampleSource || baseSource?.startsWith(voiceSampleSourcePrefix)
    if (node.type !== 'ImportDeclaration' || !matchesSource || !node.source) {
      continue
    }
    const specifiers = node.specifiers ?? []
    const defaultImports = specifiers.filter(specifier => specifier.type === 'ImportDefaultSpecifier')
    if (defaultImports.length !== 1 || specifiers.length !== 1) {
      throw new Error("Voice samples must use exactly one default import from 'voice-sample' or a 'voice-sample:<name>' alias.")
    }
    const attributes = attributesRecord(node)
    const text = attributes.text
    if (!text) {
      throw new Error('Voice sample imports require a non-empty text attribute.')
    }
    const format = attributes.format ?? defaults.format
    if (!isVoiceSampleFormat(format)) {
      throw new Error(`Unsupported voice sample format "${format}". Expected pcm, wav, or opus.`)
    }
    const voice = attributes.voice ?? defaults.voice
    if (!voice) {
      throw new Error('Voice sample imports require a voice attribute or plugin default.')
    }
    const language = attributes.language ?? defaults.language
    if (!language) {
      throw new Error('Voice sample imports require a language attribute or plugin default.')
    }
    const clause = attributeClauseRange(code, node)
    if (!clause) {
      throw new Error('Voice sample imports require an import attribute clause containing text.')
    }
    const request: VoiceSampleRequest = {
      format,
      language,
      text,
      voice,
      ...attributes.emotion ? {emotion: attributes.emotion} : {},
    }
    imports.push({
      kind,
      request,
      edits: [
        {
          end: node.source.end,
          start: node.source.start,
          text: '',
        },
        {
          ...clause,
          text: '',
        },
      ],
    })
  }
  return imports
}

export const applyEdits = (code: string, edits: Array<VoiceSampleEdit>) => {
  let output = code
  for (const edit of edits.toSorted((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  return output
}
