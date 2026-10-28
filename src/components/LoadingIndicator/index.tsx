import Branch from 'branch-component'
import {useEffect, useState} from 'react'
import {createPortal} from 'react-dom'

import {loadingItems} from '#src/lib/loadingItems.ts'

import css from './style.module.sass'

/** how often the indicator counts the loading items, in milliseconds */
const pollInterval = 250

/** A spinner at the right edge while anything is still loading, with the number of loading items beside it once there are several. */
export default function LoadingIndicator() {
  const [count, setCount] = useState(() => loadingItems().length)
  useEffect(() => {
    const interval = setInterval(() => setCount(loadingItems().length), pollInterval)
    return () => clearInterval(interval)
  }, [])
  if (!count) {
    return null
  }
  // A sibling of index.html’s loading screen, since the app’s root stacks below it as a whole.
  return createPortal(<div className={css.container} aria-label={`Loading ${count} ${count === 1 ? 'item' : 'items'}`} role='status'>
    <Branch not={count === 1}><span className={css.count}>{count}</span></Branch>
    <span className={css.spinner} />
  </div>, document.body)
}
