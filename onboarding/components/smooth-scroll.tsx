"use client"

import { ReactLenis } from "lenis/react"

// Momentum / inertia scrolling. A lower `lerp` makes the scroll feel heavier —
// it glides and settles rather than stopping dead. `anchors` smooth-scrolls the
// nav jump-links too.
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.06,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.2,
        anchors: true,
      }}
    >
      {children}
    </ReactLenis>
  )
}
