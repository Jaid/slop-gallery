import type {Plugin} from 'vite'

import {resolve} from 'node:path'

import browserslistToEsbuild from 'browserslist-to-esbuild'

/** Infer the build target without overriding an explicit consumer target. */
export default function browserslistTargetPlugin(): Plugin {
  return {
    name: 'browserslist-target',
    config(config) {
      if (config.build?.target !== undefined) {
        return
      }
      const target = browserslistToEsbuild(undefined, {path: resolve(config.root ?? '.')})
      if (!target.length) {
        throw new Error('Browserslist did not resolve to any supported Vite build targets.')
      }
      return {build: {target}}
    },
  }
}
