import type {ESTree} from 'vite'

/** a static import or re-export of a module, with what its attribute clause says */
export type ModuleImport = {
  attributes: Readonly<Partial<Record<string, string>>>
  end: number
  /** the specifier as written */
  source: string
  /** where the specifier starts, up to {@link end} the range that holds it and its attribute clause */
  start: number
}
export type Edit = {
  end: number
  start: number
  text: string
}
type SourceStatement = ESTree.ExportAllDeclaration | ESTree.ExportNamedDeclaration | ESTree.ImportDeclaration
type Statement = ESTree.Program['body'][number]

const sourceStatementTypes = new Set<string>(['ExportAllDeclaration', 'ExportNamedDeclaration', 'ImportDeclaration'] satisfies Array<SourceStatement['type']>)
const isSourceStatement = (statement: Statement): statement is SourceStatement => sourceStatementTypes.has(statement.type)
const isTypeOnly = (statement: SourceStatement) => {
  return statement.type === 'ImportDeclaration' ? statement.importKind === 'type' : statement.exportKind === 'type'
}

/**
 * Lists the module’s static imports and re-exports that come with import attributes or name their module in a way {@link matchesSource} accepts, type-only ones aside.
 *
 * Each covers its specifier and its attribute clause, so that replacing the range swaps the specifier and drops the attributes.
 */
export const findImports = (code: string, program: ESTree.Program, matchesSource: (source: string) => boolean = () => false): Array<ModuleImport> => {
  const imports: Array<ModuleImport> = []
  for (const statement of program.body) {
    if (!isSourceStatement(statement) || !statement.source || isTypeOnly(statement)) {
      continue
    }
    const source = statement.source.value
    const {attributes} = statement
    if (!attributes.length) {
      if (matchesSource(source)) {
        imports.push({
          source,
          attributes: {},
          start: statement.source.start,
          end: statement.source.end,
        })
      }
      continue
    }
    const record: Partial<Record<string, string>> = {}
    for (const attribute of attributes) {
      const key = attribute.key.type === 'Identifier' ? attribute.key.name : attribute.key.value
      if (Object.hasOwn(record, key)) {
        throw new Error(`The import of ${source} has the attribute ${key} twice.`)
      }
      record[key] = attribute.value.value
    }
    const close = code.indexOf('}', attributes.at(-1)!.end)
    if (close === -1 || close >= statement.end) {
      throw new Error(`Could not find the end of the attribute clause of the import of ${source}.`)
    }
    imports.push({
      source,
      attributes: record,
      start: statement.source.start,
      end: close + 1,
    })
  }
  return imports
}

export const applyEdits = (code: string, edits: ReadonlyArray<Edit>) => {
  let output = code
  for (const edit of edits.toSorted((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  return output
}
