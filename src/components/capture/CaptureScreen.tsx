'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Lightbulb, Info, Box, Palette, FileText, Mountain, VideoOff, Images, CheckCircle2 } from 'lucide-react'
import type { CaptureMode, CapturedMedia } from './CaptureFlow'

const MODES: { id: CaptureMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'scan3d',    label: '360° Object',    icon: Box      },
  { id: 'relief180', label: 'Textured Relief', icon: Mountain },
  { id: 'artwork2d', label: '2D Masterpiece',  icon: Palette  },
  { id: 'document',  label: 'Document',        icon: FileText },
]

interface Props {
  mode: CaptureMode
  onModeChange: (mode: CaptureMode) => void
  onCapture: (media: CapturedMedia) => void
  onClose: () => void
}

const ORBIT_CX = 150, ORBIT_CY = 312, ORBIT_RX = 88, ORBIT_RY = 20
const RING_CX = 150, RING_CY = 190, RING_R = 52
const RING_CIRC = 2 * Math.PI * RING_R

type CameraStatus = 'requesting' | 'active' | 'denied' | 'unavailable' | 'error'

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
}

export default function CaptureScreen({ mode, onModeChange, onCapture, onClose }: Props) {
  // ── Camera state ──────────────────────────────────────────────────────────
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting')
  const [orbitAngle, setOrbitAngle] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // ── Document multi-page state ─────────────────────────────────────────────
  const [docPages, setDocPages] = useState<Blob[]>([])
  const [docOverlay, setDocOverlay] = useState(false)

  // ── Level indicator for 2D mode ───────────────────────────────────────────
  const [levelBeta, setLevelBeta] = useState(30)
  const [levelGamma, setLevelGamma] = useState(20)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunks = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  const is2D       = mode === 'artwork2d'
  const isDocument = mode === 'document'
  const isRelief   = mode === 'relief180'
  const isFlat     = is2D || isDocument
  const isOrbitMode = !isFlat
  const cameraReady = cameraStatus === 'active'

  // Per-mode recording duration: 8 s for 360°, 4 s for relief
  const recordingMaxMs = isRelief ? 4_000 : 8_000

  const accent = is2D      ? 'rgb(196 181 253)'
               : isDocument ? 'rgb(125 211 252)'
               : isRelief   ? 'rgb(251 146 60)'
               :               'rgb(251 191 36)'

  const pointColor = is2D      ? 'rgb(196 181 253)'
                   : isDocument ? 'rgb(125 211 252)'
                   : isRelief   ? 'rgb(251 146 60)'
                   :               'rgb(110 231 183)'

  // Level computed values
  const isLevel = is2D && Math.abs(levelBeta) < 8 && Math.abs(levelGamma) < 8
  const bubbleX = Math.max(-11, Math.min(11, (levelGamma / 30) * 11))
  const bubbleY = Math.max(-11, Math.min(11, (levelBeta  / 30) * 11))

  // ── Camera init ───────────────────────────────────────────────────────────
  const initCamera = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable')
      return
    }
    setCameraStatus('requesting')
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(s => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
        setCameraStatus('active')
      })
      .catch(err => {
        const status: CameraStatus =
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' ? 'denied' :
          err.name === 'NotFoundError'   || err.name === 'DevicesNotFoundError'  ? 'unavailable' :
          'error'
        setCameraStatus(status)
      })
  }, [])

  useEffect(() => {
    initCamera()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(recordingTimerRef.current)
    }
  }, [initCamera])

  // Reset doc state and stop any recording when mode changes
  useEffect(() => {
    if (isRecording) {
      clearInterval(recordingTimerRef.current)
      mediaRecorderRef.current?.stop()
    }
    setDocPages([])
    setDocOverlay(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Orbit dot animation
  useEffect(() => {
    let rafId: number, last = 0
    const step = (t: number) => {
      if (t - last > 14) { setOrbitAngle(a => (a + 0.9) % 360); last = t }
      rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Device orientation for 2D level indicator
  useEffect(() => {
    if (!is2D) { setLevelBeta(30); setLevelGamma(20); return }
    let cleanup: (() => void) | undefined
    const handler = (e: DeviceOrientationEvent) => {
      setLevelBeta(e.beta  ?? 30)
      setLevelGamma(e.gamma ?? 20)
    }
    if (typeof window !== 'undefined') {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
      if (typeof DOE.requestPermission === 'function') {
        DOE.requestPermission()
          .then(perm => {
            if (perm === 'granted') {
              window.addEventListener('deviceorientation', handler)
              cleanup = () => window.removeEventListener('deviceorientation', handler)
            } else {
              const t = setTimeout(() => { setLevelBeta(1.5); setLevelGamma(0.8) }, 1500)
              cleanup = () => clearTimeout(t)
            }
          })
          .catch(() => {
            const t = window.setTimeout(() => { setLevelBeta(1.5); setLevelGamma(0.8) }, 1500)
            cleanup = () => clearTimeout(t)
          })
      } else if ('ondeviceorientation' in window) {
        window.addEventListener('deviceorientation', handler)
        cleanup = () => window.removeEventListener('deviceorientation', handler)
      } else {
        // Desktop: simulate leveling after 2 s
        const t = setTimeout(() => { setLevelBeta(1.5); setLevelGamma(0.8) }, 2000)
        cleanup = () => clearTimeout(t)
      }
    }
    return () => cleanup?.()
  }, [is2D])

  // ── Image capture ─────────────────────────────────────────────────────────
  const captureImage = useCallback(() => {
    if (isCapturing) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    setIsCapturing(true)
    setScanProgress(0)
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      const url = URL.createObjectURL(blob)
      let p = 0
      const tick = setInterval(() => {
        p += 5; setScanProgress(Math.min(p, 100))
        if (p >= 100) { clearInterval(tick); setTimeout(() => onCapture({ blob, url, mediaType: 'image' }), 350) }
      }, 20)
    }, 'image/jpeg', 0.92)
  }, [isCapturing, onCapture])

  // ── Document page capture ─────────────────────────────────────────────────
  const captureDocPage = useCallback(() => {
    if (isCapturing || docOverlay) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    setIsCapturing(true)
    setScanProgress(0)
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      // Brief progress flash, then show between-pages overlay
      let p = 0
      const tick = setInterval(() => {
        p += 8; setScanProgress(Math.min(p, 100))
        if (p >= 100) {
          clearInterval(tick)
          setDocPages(prev => [...prev, blob])
          setIsCapturing(false)
          setScanProgress(0)
          setDocOverlay(true)
        }
      }, 20)
    }, 'image/jpeg', 0.92)
  }, [isCapturing, docOverlay])

  const finishDocument = useCallback(() => {
    const allPages = docPages
    if (!allPages.length) return
    const primaryBlob = allPages[0]
    const url = URL.createObjectURL(primaryBlob)
    setDocPages([])
    setDocOverlay(false)
    onCapture({ blob: primaryBlob, url, mediaType: 'image', pages: allPages })
  }, [docPages, onCapture])

  const dismissDocOverlay = useCallback(() => setDocOverlay(false), [])

  // ── Video recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const maxMs = isRelief ? 4_000 : 8_000
    const stream = streamRef.current
    if (!stream || isCapturing) return
    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recordingChunks.current = []
    recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunks.current.push(e.data) }
    recorder.onstop = () => {
      clearInterval(recordingTimerRef.current)
      const blob = new Blob(recordingChunks.current, { type: recorder.mimeType || 'video/webm' })
      const url = URL.createObjectURL(blob)
      setIsRecording(false)
      setIsCapturing(false)
      setScanProgress(0)
      onCapture({ blob, url, mediaType: 'video' })
    }
    mediaRecorderRef.current = recorder
    recorder.start(100)
    setIsRecording(true)
    setIsCapturing(true)
    setScanProgress(0)
    const startTime = Date.now()
    recordingTimerRef.current = window.setInterval(() => {
      const pct = Math.min(((Date.now() - startTime) / maxMs) * 100, 100)
      setScanProgress(pct)
      if (pct >= 100) recorder.stop()
    }, 100)
  }, [isCapturing, isRelief, onCapture])

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const mediaType: CapturedMedia['mediaType'] = file.type.startsWith('video/') ? 'video' : 'image'
    onCapture({ blob: file, url, mediaType })
    e.target.value = ''
  }, [onCapture])

  // ── Shutter ───────────────────────────────────────────────────────────────
  const handleShutter = useCallback(() => {
    if (isDocument) {
      if (!docOverlay && !isCapturing) captureDocPage()
    } else if (isOrbitMode) {
      if (!isRecording) startRecording()
      // Orbit modes auto-complete — no manual stop via shutter
    } else {
      captureImage()
    }
  }, [isDocument, isOrbitMode, isRecording, docOverlay, isCapturing, captureDocPage, startRecording, captureImage])

  // ── SVG calculations ──────────────────────────────────────────────────────
  const rad     = (orbitAngle * Math.PI) / 180
  const dotX    = ORBIT_CX + ORBIT_RX * Math.sin(rad)
  const dotY    = ORBIT_CY - ORBIT_RY * Math.cos(rad)

  const coverageAngle = (scanProgress / 100) * 2 * Math.PI
  const arcEndX = ORBIT_CX + ORBIT_RX * Math.sin(coverageAngle)
  const arcEndY = ORBIT_CY - ORBIT_RY * Math.cos(coverageAngle)
  const largeArc = scanProgress > 50 ? 1 : 0
  const coveragePath = scanProgress > 0 && scanProgress < 100
    ? `M ${ORBIT_CX} ${ORBIT_CY - ORBIT_RY} A ${ORBIT_RX} ${ORBIT_RY} 0 ${largeArc} 1 ${arcEndX} ${arcEndY}`
    : ''

  const ringOffset = RING_CIRC * (1 - scanProgress / 100)

  const reliefNorm      = orbitAngle % 360
  const reliefOsc       = reliefNorm <= 180 ? reliefNorm : 360 - reliefNorm
  const reliefIdleRad   = Math.PI * (1 - reliefOsc / 180)
  const reliefIdleDotX  = ORBIT_CX + ORBIT_RX * Math.cos(reliefIdleRad)
  const reliefIdleDotY  = ORBIT_CY - ORBIT_RY * Math.sin(reliefIdleRad)
  const reliefCovRad    = Math.PI - (scanProgress / 100) * Math.PI
  const reliefCovX      = ORBIT_CX + ORBIT_RX * Math.cos(reliefCovRad)
  const reliefCovY      = ORBIT_CY - ORBIT_RY * Math.sin(reliefCovRad)
  const reliefDotX      = isCapturing ? reliefCovX : reliefIdleDotX
  const reliefDotY      = isCapturing ? reliefCovY : reliefIdleDotY
  const reliefLargeArc  = scanProgress > 50 ? 1 : 0
  const reliefCovPath   = isCapturing && scanProgress > 0 && scanProgress < 100
    ? `M ${ORBIT_CX - ORBIT_RX} ${ORBIT_CY} A ${ORBIT_RX} ${ORBIT_RY} 0 ${reliefLargeArc} 1 ${reliefCovX} ${reliefCovY}`
    : ''

  // ── UI text ───────────────────────────────────────────────────────────────
  const hudLabel = is2D ? 'ALIGN ARTWORK' : isDocument ? 'ALIGN DOCUMENT' : isRelief ? 'ALIGN RELIEF' : 'ALIGN OBJECT'

  const tipText = docOverlay
    ? ''
    : isDocument && docPages.length > 0
    ? `Page ${docPages.length} saved — press shutter to add another`
    : isRecording
    ? isRelief ? 'Pivot slowly left-to-right over the surface texture'
               : 'Walk slowly around the object for full 360° coverage'
    : isCapturing
    ? is2D ? 'Hold steady — capturing every brushstroke and texture'
           : 'Hold steady — scanning'
    : is2D       ? 'Lay artwork flat · Level indicator turns green when steady'
    : isDocument  ? 'Place each page flat within the frame, then press shutter'
    : isRelief    ? 'Hold relief artwork at arm\'s length, facing forward'
    : 'Center the object inside the guide, then press Scan'

  const scanLabel = isDocument ? 'CAPTURING' : isFlat ? 'CAPTURING' : isRecording ? 'RECORDING' : 'SCANNING'

  const accentBtn = is2D
    ? { idle: 'bg-violet-400 hover:bg-violet-300', active: 'bg-violet-500' }
    : isDocument
    ? { idle: 'bg-sky-400 hover:bg-sky-300',     active: 'bg-sky-500' }
    : isRelief
    ? { idle: 'bg-orange-400 hover:bg-orange-300', active: 'bg-orange-500' }
    : { idle: 'bg-amber-400 hover:bg-amber-300',  active: 'bg-amber-500' }

  const accentTailwind = is2D ? 'bg-violet-500 hover:bg-violet-400'
    : isDocument ? 'bg-sky-500 hover:bg-sky-400'
    : isRelief   ? 'bg-orange-500 hover:bg-orange-400'
    :               'bg-amber-500 hover:bg-amber-400'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 flex-shrink-0">
        <button onClick={onClose} className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cameraReady ? 'animate-pulse' : 'opacity-40'} ${
            is2D ? 'bg-violet-400' : isDocument ? 'bg-sky-400' : isRelief ? 'bg-orange-400' : 'bg-amber-400'
          }`} />
          <span className="text-white/75 text-xs font-mono tracking-[0.15em] uppercase">
            {cameraStatus === 'requesting'  ? 'Connecting…'
           : cameraStatus === 'denied'      ? 'Access Denied'
           : cameraStatus === 'unavailable' ? 'No Camera'
           : cameraStatus === 'error'       ? 'Camera Error'
           : is2D ? 'Vision AI Active' : isDocument ? 'OCR Engine Active' : isRelief ? 'Depth Sensor Active' : 'LiDAR Active'}
          </span>
        </div>
        <button className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors" aria-label="Toggle flash">
          <Lightbulb className="w-5 h-5" />
        </button>
      </div>

      {/* Mode switcher */}
      <div className="flex justify-center px-5 pb-3 flex-shrink-0">
        <div className="inline-flex p-1 rounded-full bg-white/8 backdrop-blur-md border border-white/10">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onModeChange(id)}
              disabled={isCapturing || isRecording}
              className={`flex items-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                mode === id
                  ? 'bg-white text-zinc-900 shadow-sm pl-2.5 pr-3'
                  : 'text-white/55 hover:text-white/85 px-2.5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {mode === id && label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">

        {/* Live camera feed */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
          autoPlay playsInline muted
        />

        {/* Dark fallback */}
        {!cameraReady && (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 38%, #3f3f46 0%, #27272a 45%, #09090b 100%)' }} />
        )}

        {/* Loading spinner */}
        {cameraStatus === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-10 h-10 rounded-full border-4 border-zinc-700 border-t-white/60 animate-spin" />
          </div>
        )}

        {/* Permission / error overlay */}
        {(cameraStatus === 'denied' || cameraStatus === 'unavailable' || cameraStatus === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center mb-5">
              <VideoOff className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-white font-semibold text-base mb-2 text-center">
              {cameraStatus === 'denied' ? 'Camera Access Required' : cameraStatus === 'unavailable' ? 'No Camera Found' : 'Camera Unavailable'}
            </h3>
            <p className="text-zinc-400 text-xs text-center leading-relaxed mb-6 max-w-xs">
              {cameraStatus === 'denied'
                ? 'Allow camera access in your browser settings, then tap Try Again.'
                : cameraStatus === 'unavailable'
                  ? 'No camera detected. Use the gallery button below to upload a photo or video.'
                  : 'Something went wrong. Tap Try Again or upload a file instead.'}
            </p>
            {cameraStatus !== 'unavailable' && (
              <button onClick={initCamera} className={`px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-colors ${accentTailwind}`}>
                Try Again
              </button>
            )}
          </div>
        )}

        {/* ── SVG scanning overlay ── */}
        {(cameraReady || cameraStatus === 'requesting') && (
          <svg viewBox="0 0 300 440" className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Feature point cloud */}
            {([
              [98,128,0.40],[158,108,0.50],[208,136,0.30],
              [84,190,0.35],[186,168,0.45],[228,196,0.30],
              [106,248,0.40],[172,256,0.35],[202,228,0.50],
              [124,206,0.30],[152,150,0.45],[190,210,0.40],
              [118,170,0.30],[238,162,0.35],[70,218,0.40],
              [144,130,0.28],[220,240,0.38],[92,155,0.42],
            ] as [number,number,number][]).map(([x,y,o],i) => (
              <circle key={i} cx={x} cy={y} r="1.8" fill={pointColor} opacity={o} />
            ))}

            {/* Alignment frame */}
            <rect x="58" y="72" width="184" height="236"
              fill="none" stroke="white" strokeWidth="0.7" strokeOpacity="0.22" strokeDasharray="6 4" />

            {/* Base mesh grid */}
            <g opacity="0.09" stroke="white" strokeWidth="0.5">
              {[90,120,150,180,210].map(x => <line key={x} x1={x} y1="72" x2={x} y2="308" />)}
              {[108,148,188,228,268].map(y => <line key={y} x1="58" y1={y} x2="242" y2={y} />)}
            </g>

            {/* 2D Masterpiece: enhanced rule-of-thirds grid + tighter brackets */}
            {is2D && (
              <g>
                <g stroke={accent} strokeWidth="0.7" opacity="0.22">
                  <line x1="119" y1="72" x2="119" y2="308" />
                  <line x1="181" y1="72" x2="181" y2="308" />
                  <line x1="58"  y1="151" x2="242" y2="151" />
                  <line x1="58"  y1="229" x2="242" y2="229" />
                </g>
                {/* Center marker */}
                <g stroke={accent} strokeWidth="0.8" opacity="0.40">
                  <line x1="145" y1="190" x2="155" y2="190" />
                  <line x1="150" y1="185" x2="150" y2="195" />
                </g>
              </g>
            )}

            {/* 360°: Wireframe sphere dome */}
            {mode === 'scan3d' && !isRecording && (
              <g>
                {/* Sphere boundary circle */}
                <circle cx="150" cy="190" r="90" fill="none" stroke={accent} strokeWidth="0.8"
                  strokeOpacity="0.30" strokeDasharray="3 2.5" />
                {/* Latitude rings — top hemisphere */}
                <ellipse cx="150" cy="190" rx="90" ry="21"  fill="none" stroke={accent} strokeWidth="0.90" strokeOpacity="0.50" />
                <ellipse cx="150" cy="145" rx="78" ry="18"  fill="none" stroke={accent} strokeWidth="0.75" strokeOpacity="0.42" />
                <ellipse cx="150" cy="112" rx="45" ry="10.5" fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.35" />
                <ellipse cx="150" cy="102" rx="16" ry="3.8" fill="none" stroke={accent} strokeWidth="0.50" strokeOpacity="0.28" />
                {/* Latitude rings — bottom hemisphere */}
                <ellipse cx="150" cy="235" rx="78" ry="18"  fill="none" stroke={accent} strokeWidth="0.75" strokeOpacity="0.38" />
                <ellipse cx="150" cy="268" rx="45" ry="10.5" fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.30" />
                {/* Longitude meridians */}
                <ellipse cx="150" cy="190" rx="31" ry="90" fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.28" />
                <ellipse cx="150" cy="190" rx="69" ry="90" fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.28" />
                <ellipse cx="150" cy="190" rx="88" ry="90" fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.28" />
                {/* Label */}
                <text x="150" y="295" fill={accent} fontSize="7" fontFamily="monospace"
                  opacity="0.55" textAnchor="middle" letterSpacing="1.2">360° SCAN VOLUME</text>
              </g>
            )}

            {/* Relief 180°: prominent semi-circle arc */}
            {isRelief && !isRecording && (
              <g>
                {/* Expanded arc guide */}
                <path d={`M ${ORBIT_CX - ORBIT_RX - 10} ${ORBIT_CY} A ${ORBIT_RX + 10} ${ORBIT_RY + 5} 0 1 1 ${ORBIT_CX + ORBIT_RX + 10} ${ORBIT_CY}`}
                  fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.30" strokeDasharray="5 4" />
                {/* End-stop ticks */}
                <line x1={ORBIT_CX - ORBIT_RX} y1={ORBIT_CY - 16} x2={ORBIT_CX - ORBIT_RX} y2={ORBIT_CY + 16}
                  stroke={accent} strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round" />
                <line x1={ORBIT_CX + ORBIT_RX} y1={ORBIT_CY - 16} x2={ORBIT_CX + ORBIT_RX} y2={ORBIT_CY + 16}
                  stroke={accent} strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round" />
                <text x={ORBIT_CX} y={ORBIT_CY - ORBIT_RY - 10} fill={accent} fontSize="7.5" fontFamily="monospace"
                  opacity="0.60" letterSpacing="1" textAnchor="middle">180° ARC</text>
                {/* Idle dot */}
                <circle cx={reliefDotX} cy={reliefDotY} r="5" fill={accent} opacity="0.90" />
                <circle cx={reliefDotX} cy={reliefDotY} r="9" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.28" />
              </g>
            )}

            {/* Corner brackets */}
            <g filter="url(#glow)" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M 58 112 L 58 72 L 98 72" />
              <path d="M 202 72 L 242 72 L 242 112" />
              <path d="M 58 268 L 58 308 L 98 308" />
              <path d="M 202 308 L 242 308 L 242 268" />
            </g>

            {/* Animated scan line */}
            <line x1="60" x2="240" stroke={accent} strokeWidth="1" strokeOpacity="0.75">
              <animate attributeName="y1" values="74;306;74" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="74;306;74" dur="2.6s" repeatCount="indefinite" />
            </line>
            <line x1="60" x2="240" stroke="white" strokeWidth="0.35" strokeOpacity="0.5">
              <animate attributeName="y1" values="74;306;74" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values="74;306;74" dur="2.6s" repeatCount="indefinite" />
            </line>

            {/* HUD labels */}
            <text x="60" y="65" fill={accent} fontSize="7.5" fontFamily="monospace" opacity="0.65" letterSpacing="1">{hudLabel}</text>
            <text x="240" y="65" fill="white" fontSize="7.5" fontFamily="monospace" opacity="0.40" letterSpacing="0.5" textAnchor="end">
              {isFlat ? 'FLAT · 0°' : isRelief ? 'FRONT 180°' : '~0.4 m'}
            </text>

            {/* Mode-specific indicators */}
            {isFlat ? (
              <>
                <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.16" />
                <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none"
                  stroke={accent} strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset}
                  transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
                  opacity={scanProgress > 0 ? 0.9 : 0}
                  style={{ transition: 'opacity 200ms, stroke-dashoffset 60ms linear' }}
                />
                <g stroke="white" strokeWidth="0.8" strokeOpacity="0.45" fill="none">
                  <circle cx={RING_CX} cy={RING_CY} r="3.5" />
                  <line x1={RING_CX - 9} y1={RING_CY} x2={RING_CX + 9} y2={RING_CY} />
                  <line x1={RING_CX} y1={RING_CY - 9} x2={RING_CX} y2={RING_CY + 9} />
                </g>
                {isCapturing && (
                  <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none" stroke={accent} strokeWidth="1" opacity="0.5">
                    <animate attributeName="r" values={`${RING_R};${RING_R + 22}`} dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
              </>
            ) : isRelief ? (
              <>
                <path d={`M ${ORBIT_CX - ORBIT_RX} ${ORBIT_CY} A ${ORBIT_RX} ${ORBIT_RY} 0 1 1 ${ORBIT_CX + ORBIT_RX} ${ORBIT_CY}`}
                  fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.18" strokeDasharray="4 3" />
                {reliefCovPath && (
                  <path d={reliefCovPath} fill="none" stroke={accent} strokeWidth="2.5" strokeOpacity="0.88" strokeLinecap="round" />
                )}
                <circle cx={reliefDotX} cy={reliefDotY} r="4.5" fill={accent} opacity="0.95" />
                <circle cx={reliefDotX} cy={reliefDotY} r="8.5" fill="none" stroke={accent} strokeWidth="1" opacity="0.30" />
                <g stroke="white" strokeWidth="0.8" strokeOpacity="0.45" fill="none">
                  <circle cx="150" cy="190" r="3.5" />
                  <line x1="141" y1="190" x2="159" y2="190" />
                  <line x1="150" y1="181" x2="150" y2="199" />
                </g>
              </>
            ) : (
              <>
                <g stroke="white" strokeWidth="0.8" strokeOpacity="0.45" fill="none">
                  <circle cx="150" cy="190" r="3.5" />
                  <line x1="141" y1="190" x2="159" y2="190" />
                  <line x1="150" y1="181" x2="150" y2="199" />
                </g>
                <ellipse cx={ORBIT_CX} cy={ORBIT_CY} rx={ORBIT_RX} ry={ORBIT_RY}
                  fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.18" strokeDasharray="4 3" />
                {coveragePath && (
                  <path d={coveragePath} fill="none" stroke={accent} strokeWidth="2.5" strokeOpacity="0.88" strokeLinecap="round" />
                )}
                <circle cx={dotX} cy={dotY} r="4.5" fill={accent} opacity="0.95" />
                <circle cx={dotX} cy={dotY} r="8.5" fill="none" stroke={accent} strokeWidth="1" opacity="0.30" />
              </>
            )}

            {/* Progress overlay (flat modes and brief flash) */}
            {isCapturing && isFlat && (
              <>
                <rect x="94" y="172" width="112" height="40" rx="5" fill="black" fillOpacity="0.65" />
                <text x="150" y="187" fill={accent}
                  fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
                  {scanLabel}
                </text>
                <text x="150" y="203" fill="white" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {`${Math.round(scanProgress)}%`}
                </text>
              </>
            )}
          </svg>
        )}

        {/* ── Document between-pages overlay ── */}
        {isDocument && docOverlay && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm">
            <div className="mx-5 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800">

              {/* Header row */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-sky-500/15 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-sky-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-zinc-100 text-sm leading-snug">
                      Page {docPages.length} Captured
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
                      {docPages.length === 1
                        ? 'Position the next page, or save now.'
                        : `${docPages.length} pages in this document.`}
                    </p>
                  </div>
                </div>

                {/* Page indicator pills */}
                <div className="flex flex-wrap gap-1.5">
                  {docPages.map((_, i) => (
                    <div key={i} className="flex items-center gap-1 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 text-sky-500 flex-shrink-0" />
                      <span className="text-sky-700 dark:text-sky-400 text-[10px] font-semibold">p.{i + 1}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 border border-dashed border-slate-300 dark:border-zinc-700 rounded-full px-2 py-0.5">
                    <span className="text-slate-400 dark:text-zinc-500 text-[10px]">p.{docPages.length + 1}?</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-3 space-y-2">
                <button
                  onClick={dismissDocOverlay}
                  className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold text-sm py-3 rounded-2xl transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Capture Page {docPages.length + 1}
                </button>
                <button
                  onClick={finishDocument}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium text-sm py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Finish & Save Document ({docPages.length} {docPages.length === 1 ? 'page' : 'pages'})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Level indicator (2D mode) ── */}
        {is2D && cameraReady && (
          <div className="absolute top-4 right-4 z-20 flex flex-col items-center gap-1">
            {/* Bubble level widget */}
            <div className={`relative w-11 h-11 rounded-full border-2 transition-all duration-300 ${
              isLevel
                ? 'border-emerald-400/80 bg-emerald-500/10'
                : 'border-red-400/60 bg-red-500/10'
            }`}>
              {/* Crosshair */}
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <div className="w-full h-px bg-white/25" />
              </div>
              <div className="absolute inset-0 flex justify-center pointer-events-none">
                <div className="h-full w-px bg-white/25" />
              </div>
              {/* Target ring */}
              <div className={`absolute inset-2.5 rounded-full border transition-colors duration-300 ${
                isLevel ? 'border-emerald-400/45' : 'border-red-400/30'
              }`} />
              {/* Bubble */}
              <div
                className={`absolute w-3.5 h-3.5 rounded-full shadow-md transition-colors duration-300 ${
                  isLevel ? 'bg-emerald-400' : 'bg-red-400'
                }`}
                style={{
                  top: '50%', left: '50%',
                  transform: `translate(calc(-50% + ${bubbleX}px), calc(-50% + ${bubbleY}px))`,
                  transition: 'transform 150ms ease-out, background-color 300ms',
                }}
              />
            </div>
            <span className={`text-[9px] font-mono tracking-wider transition-colors duration-300 ${
              isLevel ? 'text-emerald-400' : 'text-red-400/80'
            }`}>
              {isLevel ? 'LEVEL' : 'TILT'}
            </span>
          </div>
        )}

        {/* REC badge */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-mono">
              {isRelief ? 'RELIEF' : '360°'} {Math.round(scanProgress)}%
            </span>
          </div>
        )}
      </div>

      {/* Tip text */}
      <div className="flex-shrink-0 px-6 py-2">
        <p className="text-center text-white/38 text-xs leading-relaxed tracking-wide">{tipText}</p>
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 flex items-center justify-around px-10 pb-14 pt-2">

        {/* Gallery / upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={(isCapturing && !isRecording) || docOverlay}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/55 hover:text-white transition-colors disabled:opacity-40"
          aria-label="Upload from gallery"
        >
          <Images className="w-5 h-5" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

        {/* Shutter or circular progress ring */}
        {isOrbitMode && isRecording ? (
          /* Auto-progress ring — replaces shutter during orbit recording */
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke={accent} strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - scanProgress / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 150ms linear' }}
              />
            </svg>
            <div className="flex flex-col items-center leading-none">
              <span className="text-white font-bold text-base tabular-nums">{Math.round(scanProgress)}%</span>
              <span className="text-white/45 text-[9px] font-mono mt-0.5">
                {Math.ceil(recordingMaxMs / 1000 * (1 - scanProgress / 100))}s
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleShutter}
            disabled={
              (!cameraReady && !isRecording) ||
              (isCapturing && !isOrbitMode) ||
              (isDocument && docOverlay)
            }
            className="relative w-20 h-20 rounded-full border-4 border-white/28 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
            aria-label={isOrbitMode ? 'Start recording' : isDocument ? 'Capture page' : 'Take photo'}
          >
            <div className={`w-14 h-14 rounded-full transition-colors duration-150 ${
              isCapturing ? accentBtn.active : accentBtn.idle
            }`} />
            {isCapturing && !isOrbitMode && (
              <div className={`absolute inset-0 rounded-full border-4 animate-ping opacity-20 ${
                is2D ? 'border-violet-400' : isDocument ? 'border-sky-400' : 'border-amber-400'
              }`} />
            )}
          </button>
        )}

        {/* Info */}
        <button className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/55 hover:text-white transition-colors">
          <Info className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
