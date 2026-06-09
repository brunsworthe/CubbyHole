'use client'

import { useState, useCallback } from 'react'
import CaptureScreen from './CaptureScreen'
import ProcessingState from './ProcessingState'
import ScanResultViewer from './ScanResultViewer'

export type CaptureMode = 'scan3d' | 'relief180' | 'artwork2d' | 'document'

export type CapturedMedia = {
  blob: Blob
  url: string
  mediaType: 'image' | 'video'
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

  const goToProcessing = useCallback((media: CapturedMedia) => {
    setCapturedMedia(media)
    setStep('processing')
  }, [])

  const goToResult = useCallback(() => setStep('result'), [])

  const goToCapture = useCallback(() => {
    // Revoke the object URL to free memory before going back to capture
    setCapturedMedia(prev => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })
    setStep('capture')
  }, [])

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
        />
      )}
    </>
  )
}
