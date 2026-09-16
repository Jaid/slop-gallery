import {ESLintUtils} from '@typescript-eslint/utils'

// eslint-disable-next-line new-cap -- RuleCreator is the library's factory, not a constructor.
export default ESLintUtils.RuleCreator(name => `https://github.com/Jaid/slop-gallery/blob/main/packages/eslint-plugin-branch-component/docs/rules/${name}.md`)
