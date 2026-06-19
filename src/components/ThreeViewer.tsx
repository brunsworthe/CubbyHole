'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useTexture } from '@react-three/drei'
import { LinearFilter, type Mesh, type MeshStandardMaterial } from 'three'

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
  const { camera, gl } = useThree()

  // Pre-upload every frame to the GPU up front (and use cheap linear filtering
  // instead of mipmaps) so swapping textures during the orbit doesn't blink
  // while WebGL lazily compiles/uploads a texture for the first time.
  useEffect(() => {
    textures.forEach(texture => {
      texture.minFilter = LinearFilter
      texture.generateMipmaps = false
      texture.needsUpdate = true
      gl.initTexture(texture)
    })
  }, [textures, gl])

  // Match the plane's proportions to the source images so frames never squish/stretch.
  const aspect = useMemo(() => {
    const image = textures[0]?.image as { width?: number; height?: number } | undefined
    return image?.width && image?.height ? image.width / image.height : 1
  }, [textures])

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
    <mesh ref={meshRef} scale={[aspect, 1, 1]}>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial ref={materialRef} map={textures[0]} side={2} />
    </mesh>
  )
}

export default function ThreeViewer({ imageUrls }: ThreeViewerProps) {
  // Typed loosely: drei's OrbitControls ref is a three-stdlib class instance,
  // but we only ever touch its `target` vector here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null)

  // Keep the orbit target near the mesh so a stray pan never strands the user
  // looking at empty space, and bound zoom so they can't clip through the plane.
  const clampPanTarget = () => {
    const controls = controlsRef.current
    if (!controls) return
    const maxPanDistance = 1.5
    if (controls.target.length() > maxPanDistance) {
      controls.target.setLength(maxPanDistance)
    }
  }

  return (
    <div className="w-full h-full bg-zinc-950">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={1} />

        <Suspense fallback={<Html center>Loading 3D Engine...</Html>}>
          {imageUrls.length > 0 && <SpinSequencePlane imageUrls={imageUrls} />}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          onChange={clampPanTarget}
          enablePan
          enableZoom
          enableRotate
          minDistance={2.5}
          maxDistance={8}
        />
      </Canvas>
    </div>
  )
}
