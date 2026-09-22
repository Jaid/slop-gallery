import type {VoiceSampleFormat, VoiceSampleLoadType, VoiceSampleRequest} from './types.ts'

export type VoiceSampleDefaults = Pick<VoiceSampleRequest, 'format' | 'language' | 'voice'> & Partial<Pick<VoiceSampleRequest, 'type'>>

export type VoiceSampleEdit = {
  end: number
  start: number
  text: string
}

export type ParsedVoiceSampleImport = {
  edits: Array<VoiceSampleEdit>
  request: VoiceSampleRequest
}

export const voiceSourcePrefix = 'voice:'
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

type AttributeName = 'emotion' | 'format' | 'language' | 'text' | 'type'

const formats = new Set<VoiceSampleFormat>(['opus', 'pcm', 'timings', 'wav'])
const loadTypes = new Set<VoiceSampleLoadType>(['contents', 'reference'])
const allowedAttributes = new Set<string>(['emotion', 'format', 'language', 'text', 'type'])
const stringValue = (value: AstValue | undefined) => {
  return typeof value?.value === 'string' ? value.value : undefined
}
const keyValue = (value: AstValue | undefined) => {
  return typeof value?.name === 'string' ? value.name : stringValue(value)
}
const isVoiceSampleFormat = (value: string): value is VoiceSampleFormat => formats.has(value as VoiceSampleFormat)
const isVoiceSampleLoadType = (value: string): value is VoiceSampleLoadType => loadTypes.has(value as VoiceSampleLoadType)
const parseVoiceSource = (source: string): {
  id: string
  voice?: string
} | undefined => {
  if (!source.startsWith(voiceSourcePrefix)) {
    return
  }
  const path = source.slice(voiceSourcePrefix.length)
  const [id, voice, ...rest] = path.split('/')
  if (!id || rest.length || voice === '') {
    throw new Error(`Invalid voice import source "${source}". Expected voice:<id> or voice:<id>/<speaker>.`)
  }
  return {
    id,
    voice,
  }
}
const attributesRecord = (node: ImportDeclaration) => {
  const result: Partial<Record<AttributeName, string>> = {}
  for (const attribute of node.attributes ?? []) {
    const key = keyValue(attribute.key)
    const value = stringValue(attribute.value)
    if (!key || value === undefined) {
      throw new Error('Voice import attributes must use string literal values.')
    }
    if (!allowedAttributes.has(key)) {
      throw new Error(`Unknown voice import attribute "${key}".`)
    }
    if (key in result) {
      throw new Error(`Duplicate voice import attribute "${key}".`)
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
    throw new Error('Could not locate the voice import attribute clause.')
  }
  const close = code.indexOf('}', last.end)
  if (close === -1 || close >= node.end) {
    throw new Error('Could not locate the end of the voice import attribute clause.')
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
    if (node.type !== 'ImportDeclaration' || !source?.startsWith(voiceSourcePrefix) || !node.source) {
      continue
    }
    const parsedSource = parseVoiceSource(source)!
    const specifiers = node.specifiers ?? []
    const defaultImports = specifiers.filter(specifier => specifier.type === 'ImportDefaultSpecifier')
    if (defaultImports.length !== 1 || specifiers.length !== 1) {
      throw new Error("Voice samples must use exactly one default import from 'voice:<id>' or 'voice:<id>/<speaker>'.")
    }
    const attributes = attributesRecord(node)
    const text = attributes.text
    if (!text) {
      throw new Error('Voice imports require a non-empty text attribute.')
    }
    const format = attributes.format ?? defaults.format
    if (!isVoiceSampleFormat(format)) {
      throw new Error(`Unsupported voice format "${format}". Expected opus, pcm, timings, or wav.`)
    }
    const defaultType = format === 'timings' ? 'contents' : 'reference'
    const type = attributes.type ?? defaults.type ?? defaultType
    if (!isVoiceSampleLoadType(type)) {
      throw new Error(`Unsupported voice import type "${type}". Expected contents or reference.`)
    }
    const voice = parsedSource.voice ?? defaults.voice
    if (!voice) {
      throw new Error('Voice imports require a speaker path component or plugin default.')
    }
    const language = attributes.language ?? defaults.language
    if (!language) {
      throw new Error('Voice imports require a language attribute or plugin default.')
    }
    const clause = attributeClauseRange(code, node)
    if (!clause) {
      throw new Error('Voice imports require an import attribute clause containing text.')
    }
    const request: VoiceSampleRequest = {
      format,
      language,
      text,
      type,
      voice,
      ...attributes.emotion ? {emotion: attributes.emotion} : {},
    }
    imports.push({
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
