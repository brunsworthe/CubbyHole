'use client'

import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useTexture } from '@react-three/drei'
import type { Mesh, MeshStandardMaterial } from 'three'

interface ThreeViewerProps {
  imageUrls: string[]
}

// Maps the camera's azimuthal angle around the Y-axis (0 → 2π) to a frame
// index, wrapping seamlessly from the last image back to the first.
function angleToFrameIndex(angle: number, frameCount: number): number {
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  return Math.floor((normalized / (Math.PI * 2)) * frameCount) % frameCount
}

function SpinSequencePlane({ imageUrls }: { imageUrls: string[] }) {
  const textures = useTexture(imageUrls)
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  const { camera } = useThree()

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return

    // Billboard: keep the plane facing the camera as it orbits
    meshRef.current.quaternion.copy(camera.quaternion)

    // Dynamic Angle Swap: pick the frame matching the camera's current orbit angle
    const angle = Math.atan2(camera.position.x, camera.position.z)
    const index = angleToFrameIndex(angle, textures.length)

    if (materialRef.current.map !== textures[index]) {
      materialRef.current.map = textures[index]
      materialRef.current.needsUpdate = true
    }
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial ref={materialRef} map={textures[0]} side={2} />
    </mesh>
  )
}

export default function ThreeViewer({ imageUrls }: ThreeViewerProps) {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 3]} intensity={1} />

      <Suspense fallback={<Html center>Loading 3D Engine...</Html>}>
        {imageUrls.length > 0 && <SpinSequencePlane imageUrls={imageUrls} />}
      </Suspense>

      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  )
}
