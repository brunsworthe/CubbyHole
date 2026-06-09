'use client'

import { useState, useCallback } from 'react'
import CaptureScreen from './CaptureScreen'
import ProcessingState from './ProcessingState'
import ScanResultViewer from './ScanResultViewer'

export type CaptureMode = 'scan3d' | 'relief180' | 'artwork2d' | 'document'

type Step = 'capture' | 'processing' | 'result'

interface Props {
  onClose: () => void
  onAddToCapsule: () => void
}

export default function CaptureFlow({ onClose, onAddToCapsule }: Props) {
  const [step, setStep] = useState<Step>('capture')
  const [mode, setMode] = useState<CaptureMode>('scan3d')

  const goToProcessing = useCallback(() => setStep('processing'), [])
  const goToResult     = useCallback(() => setStep('result'), [])
  const goToCapture    = useCallback(() => setStep('capture'), [])

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
          onAddToCapsule={onAddToCapsule}
          onSetPrivacy={() => {/* wires into ShareSettingsModal in a future session */}}
          onRescan={goToCapture}
        />
      )}
    </>
  )
}
