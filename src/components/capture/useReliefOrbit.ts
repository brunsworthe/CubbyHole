'use client'
import { useState, useRef, useCallback } from 'react'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, clamp } from './useTiltZoom'
export { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, clamp }

const MAX_ROT_Y = 80
const MAX_ROT_X = 55

type Point = { x: number; y: number }
const pointDist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

export function useReliefOrbit() {
  const [rotation, setRotation] = useState({ x: -12, y: 0 })
  const [zoomScale, setZoomScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  const ref = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ px: number; py: number; rx: number; ry: number } | null>(null)
  const activePointers = useRef(new Map<number, Point>())
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)

  const adjustZoom = useCallback((delta: number) => {
    setZoomScale(z => clamp(Math.round((z + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM))
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    setZoomScale(z => clamp(z - e.deltaY * 0.0016, MIN_ZOOM, MAX_ZOOM))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.current.size === 2) {
      const [a, b] = Array.from(activePointers.current.values())
      pinchRef.current = { dist: pointDist(a, b), zoom: zoomScale }
      dragStart.current = null
      setIsDragging(false)
    } else if (activePointers.current.size === 1) {
      dragStart.current = { px: e.clientX, py: e.clientY, rx: rotation.x, ry: rotation.y }
      setIsDragging(true)
    }
  }, [zoomScale, rotation])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(e.pointerId)) return
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2 && pinchRef.current) {
      const [a, b] = Array.from(activePointers.current.values())
      setZoomScale(clamp(pinchRef.current.zoom * (pointDist(a, b) / pinchRef.current.dist), MIN_ZOOM, MAX_ZOOM))
    } else if (activePointers.current.size === 1 && dragStart.current) {
      const { px, py, rx, ry } = dragStart.current
      setRotation({
        x: clamp(rx + (e.clientY - py) * 0.4, -MAX_ROT_X, MAX_ROT_X),
        y: clamp(ry + (e.clientX - px) * 0.55, -MAX_ROT_Y, MAX_ROT_Y),
      })
    }
  }, [])

  const releasePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) pinchRef.current = null
    if (activePointers.current.size === 0) {
      setIsDragging(false)
      dragStart.current = null
    }
  }, [])

  const pedestalScale = 1 + (zoomScale - 1) * 0.28
  const ambientScale = 1 + Math.max(0, 1 - zoomScale) * 0.6

  return {
    ref, rotation, isDragging, zoomScale, pedestalScale, ambientScale, adjustZoom,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: releasePointer,
      onPointerLeave: releasePointer,
      onPointerCancel: releasePointer,
      onWheel: handleWheel,
    },
  }
}
