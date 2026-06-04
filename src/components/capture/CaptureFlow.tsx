'use client'

import { useState, useCallback } from 'react'
import CaptureScreen from './CaptureScreen'
import ProcessingState from './ProcessingState'
import ScanResultViewer from './ScanResultViewer'

type Step = 'capture' | 'processing' | 'result'

interface Props {
  onClose: () => void
  onAddToCapsule: () => void
}

export default function CaptureFlow({ onClose, onAddToCapsule }: Props) {
  const [step, setStep] = useState<Step>('capture')

  const goToProcessing  = useCallback(() => setStep('processing'), [])
  const goToResult      = useCallback(() => setStep('result'), [])
  const goToCapture     = useCallback(() => setStep('capture'), [])

  return (
    <>
      {step === 'capture' && (
        <CaptureScreen onCapture={goToProcessing} onClose={onClose} />
      )}
      {step === 'processing' && (
        <ProcessingState onComplete={goToResult} />
      )}
      {step === 'result' && (
        <ScanResultViewer
          onAddToCapsule={onAddToCapsule}
          onSetPrivacy={() => {/* wires into ShareSettingsModal in a future session */}}
          onRescan={goToCapture}
        />
      )}
    </>
  )
}
