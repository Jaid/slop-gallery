import type {Plugin} from 'vite'

import {knotExhibition} from '../knots/exhibition.ts'

const knotMaterialsModule = 'virtual:knot-exhibition-materials'
const resolvedKnotMaterialsModule = `\0${knotMaterialsModule}`
const knotMaterialsPlugin = (): Plugin => ({
  name: 'knot-exhibition-materials',
  resolveId(id) {
    if (id === knotMaterialsModule) {
      return resolvedKnotMaterialsModule
    }
  },
  load(id) {
    if (id !== resolvedKnotMaterialsModule) {
      return
    }
    const imports = knotExhibition.map((item, index) => `import Material${index} from ${JSON.stringify(`/src/lib/knots/${item.model}/items/${item.sourceId}/material.ts`)}`)
    const constructors = knotExhibition.map((_, index) => `Material${index}`)
    return `${imports.join('\n')}\nexport default [${constructors.join(', ')}]\n`
  },
})

export default knotMaterialsPlugin
