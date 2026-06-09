'use client'

import { useState, useCallback, useEffect } from 'react'
import CaptureScreen from './CaptureScreen'
import ProcessingState from './ProcessingState'
import ScanResultViewer from './ScanResultViewer'
import { saveCapture, getLatestCapture, clearCaptures } from '@/lib/captureDB'

export type CaptureMode = 'scan3d' | 'relief180' | 'artwork2d' | 'document'

export type CapturedMedia = {
  blob: Blob
  url: string
  mediaType: 'image' | 'video'
}

const MODE_LABELS: Record<CaptureMode, string> = {
  scan3d:    '360° Object',
  relief180: 'Textured Relief (180°)',
  artwork2d: '2D Masterpiece',
  document:  'Document Scanner',
}

type Step = 'capture' | 'processing' | 'result'

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
      setCapturedMedia({ blob: record.asset, url, mediaType: record.mediaType })
      setStep('result')
    }).catch(() => {})
  }, [])

  const goToProcessing = useCallback((media: CapturedMedia) => {
    setCapturedMedia(media)
    setStep('processing')
    // Persist to IndexedDB — fire-and-forget, failure is non-critical
    saveCapture({
      id: Date.now().toString(),
      mode,
      type: MODE_LABELS[mode],
      asset: media.blob,
      mediaType: media.mediaType,
      timestamp: Date.now(),
    }).catch(() => {})
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
          onCapture={goToProcessing}
          onClose={onClose}
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
