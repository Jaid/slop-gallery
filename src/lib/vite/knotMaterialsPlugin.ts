import type {Plugin} from 'vite'

import {knots} from '../knots/index.ts'

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
    const displayed = knots.filter(item => !item.archived)
    const imports = displayed.map((item, index) => `import Material${index} from ${JSON.stringify(`/src/lib/knots/${item.model}/items/${item.sourceId}/material.ts`)}`)
    const constructors = displayed.map((item, index) => `[${JSON.stringify(item.id)}, Material${index}]`)
    return `${imports.join('\n')}\nexport default new Map([${constructors.join(', ')}])\n`
  },
})

export default knotMaterialsPlugin
