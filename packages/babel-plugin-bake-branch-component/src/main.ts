import type {NodePath, PluginObject, PluginPass} from '@babel/core'

import {types as t} from '@babel/core'

const branchModule = 'branch-component'
const conditionNames = ['if', 'not', 'some', 'none', 'all'] as const
const supportedNames = new Set([...conditionNames, 'then', 'else', 'children'])

type BranchConditionName = typeof conditionNames[number]
type BakeState = {
  branchImports: Map<string, NodePath<t.ImportDefaultSpecifier>>
  createElementId?: t.Identifier
  needsCreateElementImport?: boolean
  outputHelperId?: t.Identifier
  programPath: NodePath<t.Program>
}

type BranchAttributes = Map<string, t.Expression>

const expressionFromAttribute = (path: NodePath<t.JSXElement>, attribute: t.JSXAttribute): t.Expression => {
  if (attribute.value === null) {
    return t.booleanLiteral(true)
  }
  if (t.isStringLiteral(attribute.value)) {
    return t.cloneNode(attribute.value)
  }
  if (t.isJSXExpressionContainer(attribute.value) && !t.isJSXEmptyExpression(attribute.value.expression)) {
    return t.cloneNode(attribute.value.expression, true)
  }
  throw path.buildCodeFrameError('Unsupported Branch attribute value.')
}
const readAttributes = (path: NodePath<t.JSXElement>): BranchAttributes => {
  const attributes: BranchAttributes = new Map
  for (const attribute of path.node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attribute)) {
      throw path.buildCodeFrameError('Branch does not support spread attributes when compiled.')
    }
    if (!t.isJSXIdentifier(attribute.name)) {
      throw path.buildCodeFrameError('Branch attributes must use plain names.')
    }
    const name = attribute.name.name
    if (!supportedNames.has(name)) {
      throw path.buildCodeFrameError(`Unsupported Branch attribute “${name}”.`)
    }
    if (attributes.has(name)) {
      throw path.buildCodeFrameError(`Duplicate Branch attribute “${name}”.`)
    }
    attributes.set(name, expressionFromAttribute(path, attribute))
  }
  return attributes
}
const collectionCondition = (expression: t.Expression, method: 'every' | 'some'): t.Expression => {
  const member = t.optionalMemberExpression(expression, t.identifier(method), false, true)
  return t.optionalCallExpression(member, [t.identifier('Boolean')], false)
}
const buildCondition = (name: BranchConditionName, expression: t.Expression): t.Expression => {
  switch (name) {
    case 'if': { return expression }
    case 'not': { return t.unaryExpression('!', expression, true) }
    case 'some': { return collectionCondition(expression, 'some') }
    case 'none': { return t.unaryExpression('!', collectionCondition(expression, 'some'), true) }
    case 'all': { return collectionCondition(expression, 'every') }
  }
}
const getCreateElementId = (state: BakeState): t.Identifier => {
  if (state.createElementId) {
    return state.createElementId
  }
  for (const statement of state.programPath.node.body) {
    if (!t.isImportDeclaration(statement) || statement.source.value !== 'react') {
      continue
    }
    const specifier = statement.specifiers.find(candidate => t.isImportSpecifier(candidate)
      && (t.isIdentifier(candidate.imported, {name: 'createElement'}) || t.isStringLiteral(candidate.imported, {value: 'createElement'})))
    if (specifier && t.isImportSpecifier(specifier)) {
      state.createElementId = t.cloneNode(specifier.local)
      return state.createElementId
    }
  }
  state.createElementId = state.programPath.scope.generateUidIdentifier('createElement')
  state.needsCreateElementImport = true
  return state.createElementId
}
const getOutputHelperId = (state: BakeState): t.Identifier => {
  state.outputHelperId ??= state.programPath.scope.generateUidIdentifier('renderBranchOutput')
  return state.outputHelperId
}
const renderOutput = (expression: t.Expression, state: BakeState): t.Expression => t.callExpression(t.cloneNode(getOutputHelperId(state)), [expression])
const buildChildren = (path: NodePath<t.JSXElement>, attributes: BranchAttributes): Array<t.Expression> => {
  const explicitChildren = attributes.get('children')
  const nestedChildren = t.react.buildChildren(path.node).map(child => {
    if (!t.isExpression(child)) {
      throw path.buildCodeFrameError('Branch does not support spread children when compiled.')
    }
    return t.cloneNode(child, true)
  })
  if (explicitChildren && nestedChildren.length) {
    throw path.buildCodeFrameError('Branch cannot compile both a children attribute and nested children.')
  }
  return explicitChildren ? [explicitChildren] : nestedChildren
}
const undefinedExpression = (): t.UnaryExpression => t.unaryExpression('void', t.numericLiteral(0), true)
const childrenOutput = (children: Array<t.Expression>): t.Expression => {
  if (children.length === 0) {
    return undefinedExpression()
  }
  if (children.length === 1) {
    return children[0]
  }
  return t.arrayExpression(children)
}
const fragmentOutput = (outputs: Array<t.Expression>): t.JSXFragment => {
  const children = outputs.map(output => {
    if (t.isJSXElement(output) || t.isJSXFragment(output)) {
      return output
    }
    return t.jsxExpressionContainer(output)
  })
  return t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), children)
}
const buildOutput = (path: NodePath<t.JSXElement>, attributes: BranchAttributes, state: BakeState): t.Expression => {
  const children = buildChildren(path, attributes)
  const thenOutput = attributes.get('then')
  if (thenOutput === undefined) {
    return childrenOutput(children)
  }
  const renderedThen = renderOutput(thenOutput, state)
  return children.length ? fragmentOutput([renderedThen, ...children]) : renderedThen
}
const buildFailureOutput = (attributes: BranchAttributes, state: BakeState): t.Expression => {
  const elseOutput = attributes.get('else')
  return elseOutput === undefined ? t.nullLiteral() : renderOutput(elseOutput, state)
}
const isBranchElement = (path: NodePath<t.JSXElement>, state: BakeState): boolean => {
  const name = path.node.openingElement.name
  if (!t.isJSXIdentifier(name)) {
    return false
  }
  const importPath = state.branchImports.get(name.name)
  return importPath !== undefined && path.scope.getBinding(name.name)?.path === importPath
}
const replaceBranch = (path: NodePath<t.JSXElement>, state: BakeState) => {
  const attributes = readAttributes(path)
  const conditions = conditionNames.flatMap(name => {
    const expression = attributes.get(name)
    return expression === undefined ? [] : [buildCondition(name, expression)]
  })
  if (!conditions.length) {
    throw path.buildCodeFrameError('Compiled Branch requires at least one condition.')
  }
  const condition = conditions.reduce((left, right) => t.logicalExpression('&&', left, right))
  const expression = t.conditionalExpression(condition, buildOutput(path, attributes, state), buildFailureOutput(attributes, state))
  if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
    path.replaceWith(t.jsxExpressionContainer(expression))
  } else {
    path.replaceWith(expression)
  }
}
const removeUnusedBranchImports = (path: NodePath<t.Program>, state: BakeState) => {
  path.scope.crawl()
  const declarations = new Set<NodePath<t.ImportDeclaration>>
  for (const [local, importPath] of state.branchImports) {
    const declaration = importPath.parentPath
    if (declaration.isImportDeclaration()) {
      declarations.add(declaration)
    }
    if (!path.scope.getBinding(local)?.referenced) {
      importPath.remove()
    }
  }
  for (const declaration of declarations) {
    if (!declaration.removed && declaration.node.specifiers.length === 0) {
      declaration.remove()
    }
  }
}
const addOutputHelper = (path: NodePath<t.Program>, state: BakeState) => {
  if (!state.outputHelperId) {
    return
  }
  const createElementId = getCreateElementId(state)
  if (state.needsCreateElementImport) {
    path.unshiftContainer('body', t.importDeclaration([t.importSpecifier(t.cloneNode(createElementId), t.identifier('createElement'))], t.stringLiteral('react')))
  }
  const output = path.scope.generateUidIdentifier('output')
  const helper = t.variableDeclaration('const', [t.variableDeclarator(t.cloneNode(state.outputHelperId), t.arrowFunctionExpression([t.cloneNode(output)], t.conditionalExpression(t.binaryExpression('===', t.unaryExpression('typeof', t.cloneNode(output)), t.stringLiteral('function')), t.callExpression(t.cloneNode(createElementId), [t.cloneNode(output)]), t.logicalExpression('??', t.cloneNode(output), t.nullLiteral()))))])
  const imports = path.get('body').filter(statement => statement.isImportDeclaration())
  const lastImport = imports.at(-1)
  if (lastImport) {
    lastImport.insertAfter(helper)
  } else {
    path.unshiftContainer('body', helper)
  }
}

export default function babelPluginBakeBranchComponent(): PluginObject {
  const states = new WeakMap<PluginPass, BakeState>
  const getState = (pass: PluginPass): BakeState => {
    const state = states.get(pass)
    if (!state) {
      throw new Error('Branch compiler state was not initialized.')
    }
    return state
  }
  return {
    name: 'bake-branch-component',
    visitor: {
      Program: {
        enter(path, pass) {
          const state: BakeState = {
            branchImports: new Map,
            programPath: path,
          }
          states.set(pass, state)
          for (const statement of path.get('body')) {
            if (!statement.isImportDeclaration() || statement.node.source.value !== branchModule) {
              continue
            }
            for (const specifier of statement.get('specifiers')) {
              if (specifier.isImportDefaultSpecifier()) {
                state.branchImports.set(specifier.node.local.name, specifier)
              }
            }
          }
        },
        exit(path, pass) {
          const state = getState(pass)
          removeUnusedBranchImports(path, state)
          addOutputHelper(path, state)
          states.delete(pass)
        },
      },
      JSXElement: {
        exit(path, pass) {
          const state = getState(pass)
          if (isBranchElement(path, state)) {
            replaceBranch(path, state)
          }
        },
      },
    },
  }
}
