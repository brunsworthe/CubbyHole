'use client'

import { useState, useCallback, useRef } from 'react'
import CaptureScreen from './CaptureScreen'
import NamingScreen from './NamingScreen'
import ProcessingState from './ProcessingState'
import ScanResultViewer from './ScanResultViewer'
import UploadSyncScreen from './UploadSyncScreen'
import { saveCapture, clearCaptures } from '@/lib/captureDB'
import { uploadCapture } from '@/lib/uploadManager'

export type CaptureMode = 'scan3d' | 'relief180' | 'artwork2d' | 'document'

export type CapturedMedia = {
  blob: Blob
  url: string
  mediaType: 'image' | 'video'
  title?: string
  pages?: Blob[]
  frames?: Blob[]
  reliefFrames?: Blob[]
}

const MODE_LABELS: Record<CaptureMode, string> = {
  scan3d:    '360° Object',
  relief180: 'Textured Relief (180°)',
  artwork2d: '2D Masterpiece',
  document:  'Document Scanner',
}

type Step = 'capture' | 'naming' | 'uploading' | 'processing' | 'result'

interface Props {
  onClose: () => void
  onAddToCapsule: () => void
}

export default function CaptureFlow({ onClose, onAddToCapsule }: Props) {
  const [step, setStep] = useState<Step>('capture')
  const [mode, setMode] = useState<CaptureMode>('scan3d')
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null)
  const [uploadError, setUploadError] = useState(false)

  // Refs hold the latest capture + title for use inside async upload closures
  const capturedMediaRef = useRef<CapturedMedia | null>(null)
  const pendingTitleRef = useRef<string | undefined>(undefined)

  // Stage 1: capture done → show naming prompt
  const goToNaming = useCallback((media: CapturedMedia) => {
    capturedMediaRef.current = media
    setCapturedMedia(media)
    setStep('naming')
  }, [])

  // Stage 2: name confirmed → run cloud upload, then processing
  const runUpload = useCallback((title?: string) => {
    const media = capturedMediaRef.current
    if (!media) return
    const titleTrimmed = title || undefined
    pendingTitleRef.current = titleTrimmed
    setCapturedMedia(prev => prev ? { ...prev, title: titleTrimmed } : prev)
    setUploadError(false)
    setStep('uploading')

    uploadCapture({
      mode,
      asset: media.blob,
      mediaType: media.mediaType,
      pages: media.pages,
      frames: media.frames,
      reliefFrames: media.reliefFrames,
    })
      .then(result => {
        saveCapture({
          id: Date.now().toString(),
          mode,
          type: MODE_LABELS[mode],
          title: titleTrimmed,
          mediaType: media.mediaType,
          timestamp: Date.now(),
          cloudUrl: result.cloudUrl,
          cloudPages: result.cloudPages,
          cloudFrames: result.cloudFrames,
          cloudReliefFrames: result.cloudReliefFrames,
        }).catch(() => {})
        setStep('processing')
      })
      .catch(() => {
        setUploadError(true)
      })
  }, [mode])

  const retryUpload = useCallback(() => {
    runUpload(pendingTitleRef.current)
  }, [runUpload])

  const cancelUpload = useCallback(() => {
    setUploadError(false)
    setStep('naming')
  }, [])

  const goToResult = useCallback(() => setStep('result'), [])

  const goToCapture = useCallback(() => {
    setCapturedMedia(prev => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })
    capturedMediaRef.current = null
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
          onConfirm={runUpload}
        />
      )}
      {step === 'uploading' && (
        <UploadSyncScreen
          hasError={uploadError}
          onRetry={retryUpload}
          onCancel={cancelUpload}
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
