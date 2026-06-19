'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useTexture } from '@react-three/drei'

interface ThreeViewerProps {
  imageUrls: string[]
}

function TexturedPlane({ imageUrl }: { imageUrl: string }) {
  const texture = useTexture(imageUrl)
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial map={texture} side={2} />
    </mesh>
  )
}

export default function ThreeViewer({ imageUrls }: ThreeViewerProps) {
  const firstImageUrl = imageUrls[0]

  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 3]} intensity={1} />

      <Suspense fallback={<Html center>Loading 3D Engine...</Html>}>
        {firstImageUrl && <TexturedPlane imageUrl={firstImageUrl} />}
      </Suspense>

      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  )
}
