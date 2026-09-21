import {renderKnotCli} from 'knot-materials/scripts/renderKnot.ts'

export {default} from 'knot-materials/scripts/renderKnot.ts'

if (import.meta.main) {
  await renderKnotCli()
}
