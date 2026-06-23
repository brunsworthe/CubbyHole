'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useTexture } from '@react-three/drei'
import { LinearFilter, SRGBColorSpace, DoubleSide, type Group, type Mesh } from 'three'

interface ThreeViewerProps {
  imageUrls: string[]
}

// Maps the camera's azimuthal angle around the Y-axis (0 → 2π) to a frame
// index, wrapping seamlessly from the last image back to the first.
function angleToFrameIndex(angle: number, frameCount: number): number {
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  return Math.floor((normalized / (Math.PI * 2)) * frameCount) % frameCount
}

function SpinSequenceStack({ imageUrls }: { imageUrls: string[] }) {
  const textures = useTexture(imageUrls)
  const groupRef = useRef<Group>(null)
  const meshRefs = useRef<(Mesh | null)[]>([])
  const { camera, gl, viewport } = useThree()

  // Pre-upload every frame to the GPU up front (and use cheap linear filtering
  // instead of mipmaps) so every mesh's material is already compiled before
  // the orbit starts swapping which one is visible — eliminates the blink.
  useEffect(() => {
    textures.forEach(texture => {
      texture.minFilter = LinearFilter
      texture.generateMipmaps = false
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      gl.initTexture(texture)
    })
  }, [textures, gl])

  // Match the stack's proportions to the source images so frames never squish/stretch.
  const aspect = useMemo(() => {
    const image = textures[0]?.image as { width?: number; height?: number } | undefined
    return image?.width && image?.height ? image.width / image.height : 1
  }, [textures])

  // Fit-contain scale: fill as much of the camera's viewport as possible without cropping.
  const [scaleX, scaleY] = useMemo(() => {
    if (viewport.width / viewport.height > aspect) {
      return [viewport.height * aspect, viewport.height]
    }
    return [viewport.width, viewport.width / aspect]
  }, [viewport.width, viewport.height, aspect])

  useFrame(() => {
    if (!groupRef.current) return

    // Billboard: keep the stack facing the camera as it orbits
    groupRef.current.quaternion.copy(camera.quaternion)

    // Dynamic Angle Swap: toggle which pre-compiled mesh is visible based on
    // the camera's current orbit angle. Nothing needs to compile mid-swap.
    const angle = Math.atan2(camera.position.x, camera.position.z)
    const activeIndex = angleToFrameIndex(angle, textures.length)

    meshRefs.current.forEach((mesh, i) => {
      if (mesh) mesh.visible = i === activeIndex
    })
  })

  return (
    <group ref={groupRef} scale={[scaleX, scaleY, 1]}>
      {textures.map((texture, i) => (
        <mesh
          key={i}
          position={[0, 0, 0]}
          visible={i === 0}
          ref={el => { meshRefs.current[i] = el }}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
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
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ alpha: true }}
        onCreated={({ scene }) => { scene.background = null }}
      >
        <Suspense fallback={<Html center>Loading 3D Engine...</Html>}>
          {imageUrls.length > 0 && <SpinSequenceStack imageUrls={imageUrls} />}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          onChange={clampPanTarget}
          enablePan
          enableZoom
          enableRotate
          enableDamping
          rotateSpeed={2.5}
          minDistance={2.5}
          maxDistance={8}
        />
      </Canvas>
    </div>
  )
}
