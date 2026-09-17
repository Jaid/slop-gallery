import {updateIconsCli} from 'knot-materials/scripts/updateIcons.ts'

export {default} from 'knot-materials/scripts/updateIcons.ts'

if (import.meta.main) {
  await updateIconsCli()
}
