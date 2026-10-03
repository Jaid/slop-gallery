import type {Plugin} from 'rolldown'

import rolldownBabelPlugin from '@rolldown/plugin-babel'
import bakeBranchComponent from 'babel-plugin-bake-branch-component'

export default function rolldownPluginBakeBranchComponent(): Promise<Plugin> {
  return rolldownBabelPlugin({
    plugins: [bakeBranchComponent],
  })
}
