import type {TSESTree} from '@typescript-eslint/utils'

import {AST_NODE_TYPES as AST, ASTUtils, TSESLint} from '@typescript-eslint/utils'

import {isComponentIdentifier} from './jsx.ts'

const moduleName = 'branch-component'
const isDefaultSpecifier = (specifier: TSESTree.Node): boolean => specifier.type === AST.ImportDefaultSpecifier || specifier.type === AST.ImportSpecifier && specifier.importKind !== 'type' && (specifier.imported.type === AST.Identifier ? specifier.imported.name : specifier.imported.value) === 'default'

/** Resolve the import binding, not merely the spelling of a JSX tag. */
export function isBranchElement(node: TSESTree.JSXElement, sourceCode: TSESLint.SourceCode): boolean {
  const name = node.openingElement.name
  const namespace = name.type === AST.JSXMemberExpression && name.object.type === AST.JSXIdentifier && name.property.name === 'default'
  const identifier = namespace ? name.object : name
  if (identifier.type !== AST.JSXIdentifier || !namespace && !isComponentIdentifier(identifier.name)) {
    return false
  }
  const variable = ASTUtils.findVariable(sourceCode.getScope(node), identifier.name)
  return variable?.defs.some(definition => {
    if (definition.type !== TSESLint.Scope.DefinitionType.ImportBinding || definition.parent.type !== AST.ImportDeclaration || definition.parent.source.value !== moduleName || definition.parent.importKind === 'type') {
      return false
    }
    const specifier = definition.node
    if (namespace) {
      return specifier.type === AST.ImportNamespaceSpecifier
    }
    return isDefaultSpecifier(specifier)
  }) ?? false
}

export function createImportResolver(sourceCode: TSESLint.SourceCode) {
  const imports = sourceCode.ast.body.filter((statement): statement is TSESTree.ImportDeclaration => statement.type === AST.ImportDeclaration && statement.source.value === moduleName && statement.importKind !== 'type')
  // Reserving every token also avoids capturing unresolved references in inner scopes.
  const usedNames = new Set(sourceCode.getTokens(sourceCode.ast).map(token => token.value))
  let newName = 'BranchComponent'
  for (let suffix = 2; usedNames.has(newName); suffix++) {
    newName = `BranchComponent${suffix}`
  }
  return (node: TSESTree.Node): {
    insert?: (fixer: TSESLint.RuleFixer) => TSESLint.RuleFix
    name: string
  } => {
    for (const declaration of imports) {
      for (const specifier of declaration.specifiers) {
        const variable = ASTUtils.findVariable(sourceCode.getScope(node), specifier.local.name)
        if (!variable?.defs.some(definition => definition.node === specifier)) {
          continue
        }
        if (specifier.type === AST.ImportNamespaceSpecifier) {
          return {name: `${specifier.local.name}.default`}
        }
        if (isDefaultSpecifier(specifier) && isComponentIdentifier(specifier.local.name)) {
          return {name: specifier.local.name}
        }
      }
    }
    // Inserting before the first non-directive statement preserves shebangs,
    // leading comments and directives such as "use client".
    const anchor = sourceCode.ast.body.find(statement => statement.type !== AST.ExpressionStatement || !statement.directive)!
    const eol = sourceCode.text.includes('\r\n') ? '\r\n' : '\n'
    const firstImport = sourceCode.ast.body.find(statement => statement.type === AST.ImportDeclaration)
    const quote = firstImport ? sourceCode.getText(firstImport.source)[0] : "'"
    const semicolon = firstImport && sourceCode.getText(firstImport).endsWith(';') ? ';' : ''
    return {
      name: newName,
      insert: fixer => fixer.insertTextBefore(anchor, `import ${newName} from ${quote}${moduleName}${quote}${semicolon}${eol}`),
    }
  }
}
