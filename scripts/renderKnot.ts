import {renderKnotCli} from 'knot-materials/scripts/renderKnot.ts'

import {knottinghamScene} from './lib/knottinghamKnotScene.ts'

export {default} from 'knot-materials/scripts/renderKnot.ts'

if (import.meta.main) {
  await renderKnotCli(Bun.argv.slice(2), {
    heavy: {
      description: 'the knot in its own Knottingham room under Heavy graphics, reflecting the gallery’s environment',
      scene: knottinghamScene('heavy'),
    },
    cinematic: {
      description: 'the same under Cinematic graphics',
      scene: knottinghamScene('cinematic'),
    },
  })
}
