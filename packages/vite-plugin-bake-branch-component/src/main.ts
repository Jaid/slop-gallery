import rolldownBabelPlugin from '@rolldown/plugin-babel'
import bakeBranchComponent from 'babel-plugin-bake-branch-component'

export default function vitePluginBakeBranchComponent() {
  return rolldownBabelPlugin({
    plugins: [bakeBranchComponent],
  })
}
