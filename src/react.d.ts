import 'react'

declare module 'react' {
  interface ButtonHTMLAttributes<T> {
    /** the id of a popover that shows while the user shows interest in the button by hovering, focusing or long-pressing it, see https://open-ui.org/components/interest-invokers.explainer */
    interestfor?: string
  }
}
