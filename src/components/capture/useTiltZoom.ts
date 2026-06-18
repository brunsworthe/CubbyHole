'use client'

import { useState, useRef, useCallback } from 'react'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3
export const ZOOM_STEP = 0.25

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type Point = { x: number; y: number }
const pointDistance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

/**
 * Shared pedestal-viewer interaction: pointer-tracked tilt/parallax, mouse-wheel
 * and simulated pinch-to-zoom (via multi-pointer distance tracking), and the
 * derived pedestal/ambient scales used to keep the stage feeling grounded at
 * any zoom level. Used by DocumentViewer (artwork2d + document) so pedestal
 * experiences stay perfectly in sync.
 */
export function useTiltZoom() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const ref = useRef<HTMLDivElement>(null)

  const activePointers = useRef(new Map<number, Point>())
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)

  const updateTilt = useCallback((clientX: number, clientY: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (clientX - rect.left) / rect.width - 0.5
    const py = (clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -16, y: px * 18 })
  }, [])

  const adjustZoom = useCallback((delta: number) => {
    setZoomScale((z) => clamp(Math.round((z + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM))
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    setZoomScale((z) => clamp(z - e.deltaY * 0.0016, MIN_ZOOM, MAX_ZOOM))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2) {
      const [a, b] = Array.from(activePointers.current.values())
      pinchRef.current = { distance: pointDistance(a, b), zoom: zoomScale }
      setActive(false)
    } else if (activePointers.current.size === 1) {
      setActive(true)
      updateTilt(e.clientX, e.clientY)
    }
  }, [zoomScale, updateTilt])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(e.pointerId)) return
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2 && pinchRef.current) {
      const [a, b] = Array.from(activePointers.current.values())
      const ratio = pointDistance(a, b) / pinchRef.current.distance
      setZoomScale(clamp(pinchRef.current.zoom * ratio, MIN_ZOOM, MAX_ZOOM))
    } else if (activePointers.current.size === 1) {
      setActive(true)
      updateTilt(e.clientX, e.clientY)
    }
  }, [updateTilt])

  const releasePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) pinchRef.current = null
    if (activePointers.current.size === 0) {
      setActive(false)
      setTilt({ x: 0, y: 0 })
    }
  }, [])

  // Pedestal shadow grows/shrinks with the artwork to stay grounded; the ambient
  // glow expands as the canvas shrinks so the surrounding "empty space" still
  // reads as a lit, three-dimensional stage rather than a void.
  const pedestalScale = 1 + (zoomScale - 1) * 0.28
  const ambientScale = 1 + Math.max(0, 1 - zoomScale) * 0.6
  const transitionClass = active ? 'duration-100 ease-out' : 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'

  return {
    ref,
    tilt,
    active,
    zoomScale,
    pedestalScale,
    ambientScale,
    transitionClass,
    adjustZoom,
    handlers: {
      onPointerMove: handlePointerMove,
      onPointerDown: handlePointerDown,
      onPointerLeave: releasePointer,
      onPointerUp: releasePointer,
      onPointerCancel: releasePointer,
      onWheel: handleWheel,
    },
  }
}
