'use client'

import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF, useAnimations } from '@react-three/drei'

function Model({ url }) {
  const { scene, animations } = useGLTF(url)
  const { actions } = useAnimations(animations, scene)

  useEffect(() => {
    const firstAction = Object.values(actions)[0]
    firstAction?.play()
  }, [actions])

  return <primitive object={scene} />
}

function LoadingFallback() {
  return (
    // Canvas is always dark for best 3D quality — fallback matches it
    <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 animate-spin" />
        <div className="absolute inset-[5px] rounded-full border border-zinc-800" />
        <div
          className="absolute inset-[5px] rounded-full border border-transparent border-b-amber-600 animate-spin"
          style={{ animationDuration: '1.4s', animationDirection: 'reverse' }}
        />
      </div>
      <p className="text-sm font-medium tracking-[0.2em] text-zinc-300 uppercase">
        Restoring digital artifact
      </p>
      <p className="mt-2 text-xs text-zinc-600 tracking-wider">Reconstructing memory…</p>
    </div>
  )
}

function ViewerCanvas({ modelUrl }) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true }} camera={{ position: [0, 0, 5], fov: 45 }}>
      <Stage environment="studio" intensity={0.6} shadows="contact" adjustCamera>
        <Model url={modelUrl} />
      </Stage>
      <OrbitControls
        makeDefault
        enableZoom
        enablePan={false}
        enableRotate
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 1.6}
        minDistance={0.5}
        maxDistance={20}
        touches={{ ONE: 0, TWO: 2 }}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </Canvas>
  )
}

export default function TimeCapsuleViewer({ modelUrl }) {
  return (
    <div className="w-full h-full bg-zinc-950">
      <Suspense fallback={<LoadingFallback />}>
        <ViewerCanvas modelUrl={modelUrl} />
      </Suspense>
    </div>
  )
}

TimeCapsuleViewer.preload = (url) => useGLTF.preload(url)
