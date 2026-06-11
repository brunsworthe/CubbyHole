'use client'

import { useState, useCallback, useEffect } from 'react'
import CaptureScreen from './CaptureScreen'
import NamingScreen from './NamingScreen'
import ProcessingState from './ProcessingState'
import ScanResultViewer from './ScanResultViewer'
import { saveCapture, getLatestCapture, clearCaptures } from '@/lib/captureDB'

export type CaptureMode = 'scan3d' | 'relief180' | 'artwork2d' | 'document'

export type CapturedMedia = {
  blob: Blob
  url: string
  mediaType: 'image' | 'video'
  title?: string
  pages?: Blob[]         // document mode: all captured page blobs
  frames?: Blob[]        // scan3d mode: 8-frame segmented capture array
  reliefFrames?: Blob[]  // relief180 mode: 5-frame lenticular capture array
}

const MODE_LABELS: Record<CaptureMode, string> = {
  scan3d:    '360° Object',
  relief180: 'Textured Relief (180°)',
  artwork2d: '2D Masterpiece',
  document:  'Document Scanner',
}

type Step = 'capture' | 'naming' | 'processing' | 'result'

interface Props {
  onClose: () => void
  onAddToCapsule: () => void
}

export default function CaptureFlow({ onClose, onAddToCapsule }: Props) {
  const [step, setStep] = useState<Step>('capture')
  const [mode, setMode] = useState<CaptureMode>('scan3d')
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null)

  // On mount: restore the latest cached capture so the viewer opens immediately
  useEffect(() => {
    getLatestCapture().then(record => {
      if (!record) return
      const url = URL.createObjectURL(record.asset)
      setMode(record.mode as CaptureMode)
      setCapturedMedia({ blob: record.asset, url, mediaType: record.mediaType, title: record.title, pages: record.pages, frames: record.frames, reliefFrames: record.reliefFrames })
      setStep('result')
    }).catch(() => {})
  }, [])

  // Stage 1: capture done → show naming prompt
  const goToNaming = useCallback((media: CapturedMedia) => {
    setCapturedMedia(media)
    setStep('naming')
  }, [])

  // Stage 2: name confirmed (or skipped) → persist and enter processing animation
  const goToProcessing = useCallback((title?: string) => {
    setCapturedMedia(prev => prev ? { ...prev, title } : prev)
    setStep('processing')
    setCapturedMedia(prev => {
      if (!prev) return prev
      saveCapture({
        id: Date.now().toString(),
        mode,
        type: MODE_LABELS[mode],
        title,
        asset: prev.blob,
        mediaType: prev.mediaType,
        timestamp: Date.now(),
        pages: prev.pages,
        frames: prev.frames,
        reliefFrames: prev.reliefFrames,
      }).catch(() => {})
      return prev
    })
  }, [mode])

  const goToResult = useCallback(() => setStep('result'), [])

  const goToCapture = useCallback(() => {
    setCapturedMedia(prev => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })
    setStep('capture')
  }, [])

  const handleClearCache = useCallback(() => {
    clearCaptures().catch(() => {})
    goToCapture()
  }, [goToCapture])

  return (
    <>
      {step === 'capture' && (
        <CaptureScreen
          mode={mode}
          onModeChange={setMode}
          onCapture={goToNaming}
          onClose={onClose}
        />
      )}
      {step === 'naming' && capturedMedia && (
        <NamingScreen
          mode={mode}
          previewUrl={capturedMedia.url}
          mediaType={capturedMedia.mediaType}
          onConfirm={goToProcessing}
        />
      )}
      {step === 'processing' && (
        <ProcessingState mode={mode} onComplete={goToResult} />
      )}
      {step === 'result' && (
        <ScanResultViewer
          mode={mode}
          capturedMedia={capturedMedia}
          onAddToCapsule={onAddToCapsule}
          onSetPrivacy={() => {/* wires into ShareSettingsModal in a future session */}}
          onRescan={goToCapture}
          onClearCache={handleClearCache}
        />
      )}
    </>
  )
}
