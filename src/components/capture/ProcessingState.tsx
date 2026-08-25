'use client'

import { useState, useEffect, useCallback } from 'react'
import { Layers, Sparkles, CheckCircle2, RotateCcw, Orbit, Focus, Sun, Mountain, Crop, Palette, SunMedium, Copy, FileCheck } from 'lucide-react'
import type { CaptureMode } from './CaptureFlow'

interface Props {
  mode: CaptureMode
  onComplete: () => void
}

type Stage = {
  id: string
  label: string
  sublabel: string
  icon: React.ComponentType<{ className?: string }>
  duration: number
  activeColor: string
  barColor: string
  iconBg: string
}

const STAGES_3D: Stage[] = [
  {
    id: 'aligning',
    label: 'Aligning Your Photos',
    sublabel: 'Matching up all 8 angles you captured',
    icon: Layers,
    duration: 1400,
    activeColor: 'text-sky-500 dark:text-sky-400',
    barColor: 'bg-sky-500',
    iconBg: 'bg-sky-50 dark:bg-sky-950/50',
  },
  {
    id: 'sequencing',
    label: 'Sequencing the Spin',
    sublabel: 'Ordering frames into a smooth 360° rotation',
    icon: RotateCcw,
    duration: 1600,
    activeColor: 'text-violet-500 dark:text-violet-400',
    barColor: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-950/50',
  },
  {
    id: 'optimizing',
    label: 'Optimizing Each Frame',
    sublabel: 'Balancing color and sharpness across the set',
    icon: Sparkles,
    duration: 1400,
    activeColor: 'text-emerald-500 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
  },
  {
    id: 'viewer',
    label: 'Building the Spin Viewer',
    sublabel: 'Getting your object ready to explore',
    icon: Orbit,
    duration: 1200,
    activeColor: 'text-slate-500 dark:text-slate-400',
    barColor: 'bg-slate-500',
    iconBg: 'bg-slate-50 dark:bg-slate-950/50',
  },
]

const STAGES_2D: Stage[] = [
  {
    id: 'framing',
    label: 'Framing Your Artwork',
    sublabel: 'Cropping to the edges of your canvas',
    icon: Crop,
    duration: 1500,
    activeColor: 'text-rose-500 dark:text-rose-400',
    barColor: 'bg-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-950/50',
  },
  {
    id: 'color',
    label: 'Balancing Color',
    sublabel: 'Adjusting tone and saturation for accuracy',
    icon: Palette,
    duration: 1700,
    activeColor: 'text-fuchsia-500 dark:text-fuchsia-400',
    barColor: 'bg-fuchsia-500',
    iconBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/50',
  },
  {
    id: 'lighting',
    label: 'Optimizing Lighting',
    sublabel: 'Evening out shadows and highlights',
    icon: Sun,
    duration: 1600,
    activeColor: 'text-violet-500 dark:text-violet-400',
    barColor: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-950/50',
  },
]

const STAGES_DOCUMENT: Stage[] = [
  {
    id: 'edges',
    label: 'Aligning Page Edges',
    sublabel: 'Straightening and cropping to the page border',
    icon: Crop,
    duration: 1400,
    activeColor: 'text-sky-500 dark:text-sky-400',
    barColor: 'bg-sky-500',
    iconBg: 'bg-sky-50 dark:bg-sky-950/50',
  },
  {
    id: 'contrast',
    label: 'Enhancing Contrast',
    sublabel: 'Sharpening text and balancing exposure',
    icon: SunMedium,
    duration: 1600,
    activeColor: 'text-blue-500 dark:text-blue-400',
    barColor: 'bg-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-950/50',
  },
  {
    id: 'pages',
    label: 'Compiling Pages',
    sublabel: 'Bringing your pages together in order',
    icon: Copy,
    duration: 1400,
    activeColor: 'text-indigo-500 dark:text-indigo-400',
    barColor: 'bg-indigo-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/50',
  },
  {
    id: 'finalizing',
    label: 'Finalizing Document',
    sublabel: 'Preparing your document for saving',
    icon: FileCheck,
    duration: 1200,
    activeColor: 'text-emerald-500 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
  },
]

const STAGES_RELIEF: Stage[] = [
  {
    id: 'base',
    label: 'Reading the Base Image',
    sublabel: 'Using your straight-on shot as the foundation',
    icon: Focus,
    duration: 1300,
    activeColor: 'text-orange-500 dark:text-orange-400',
    barColor: 'bg-orange-500',
    iconBg: 'bg-orange-50 dark:bg-orange-950/50',
  },
  {
    id: 'angles',
    label: 'Mapping the 5 Angles',
    sublabel: 'Comparing light and shadow across each shot',
    icon: Sun,
    duration: 1800,
    activeColor: 'text-slate-500 dark:text-slate-400',
    barColor: 'bg-slate-500',
    iconBg: 'bg-slate-50 dark:bg-slate-950/50',
  },
  {
    id: 'texture',
    label: 'Building Surface Texture',
    sublabel: 'Turning light changes into a textured relief',
    icon: Mountain,
    duration: 1600,
    activeColor: 'text-rose-500 dark:text-rose-400',
    barColor: 'bg-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-950/50',
  },
  {
    id: 'viewer',
    label: 'Building Relief Viewer',
    sublabel: 'Getting your relief ready to explore',
    icon: Layers,
    duration: 1200,
    activeColor: 'text-violet-500 dark:text-violet-400',
    barColor: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-950/50',
  },
]

export default function ProcessingState({ mode, onComplete }: Props) {
  const is2D = mode === 'artwork2d'
  const isDocument = mode === 'document'
  const isRelief = mode === 'relief180'
  const STAGES = is2D ? STAGES_2D : isDocument ? STAGES_DOCUMENT : isRelief ? STAGES_RELIEF : STAGES_3D

  const [activeStage, setActiveStage] = useState(0)
  const [stageProgress, setStageProgress] = useState(0)
  const [completedStages, setCompletedStages] = useState<number[]>([])

  const handleComplete = useCallback(onComplete, [onComplete])

  // Reset the sequence whenever the mode changes
  useEffect(() => {
    setActiveStage(0)
    setStageProgress(0)
    setCompletedStages([])
  }, [mode])

  useEffect(() => {
    if (activeStage >= STAGES.length) {
      const t = setTimeout(handleComplete, 700)
      return () => clearTimeout(t)
    }

    const stage = STAGES[activeStage]
    const tickMs = 30
    const steps = stage.duration / tickMs
    let step = 0

    const tick = setInterval(() => {
      step++
      const progress = Math.min((step / steps) * 100, 100)
      setStageProgress(progress)
      if (progress >= 100) {
        clearInterval(tick)
        setCompletedStages((prev) => [...prev, activeStage])
        setTimeout(() => {
          setActiveStage((s) => s + 1)
          setStageProgress(0)
        }, 320)
      }
    }, tickMs)

    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, mode, handleComplete])

  const isDone = activeStage >= STAGES.length

  const titleText = isDone
    ? (is2D ? 'Artwork Saved' : isDocument ? 'Document Saved' : isRelief ? 'Relief Ready' : '360° View Ready')
    : (is2D ? 'Optimizing Artwork' : isDocument ? 'Processing Document' : isRelief ? 'Mapping Relief Angles' : 'Building 360° View')
  const subtitleText = isDone
    ? (is2D
        ? 'Your artwork has been cropped and color-balanced.'
        : isDocument
          ? 'Your pages have been aligned and enhanced.'
          : isRelief
            ? 'Your textured relief is ready to explore.'
            : 'Your 360° spin view is ready to explore.')
    : (is2D
        ? 'Polishing your artwork…'
        : isDocument
          ? 'Cleaning up your pages…'
          : isRelief
            ? 'Mapping every angle…'
            : 'Sequencing your captures…')

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Title */}
      <div className="mb-8 text-center">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition-colors duration-500 ${
          isDone
            ? 'bg-emerald-50 dark:bg-emerald-950/50'
            : is2D ? 'bg-violet-50 dark:bg-violet-950/40' : isDocument ? 'bg-sky-50 dark:bg-sky-950/40' : isRelief ? 'bg-orange-50 dark:bg-orange-950/40' : 'bg-slate-50 dark:bg-slate-950/40'
        }`}>
          {isDone
            ? <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            : <div className={`w-6 h-6 border-[3px] border-slate-200 dark:border-zinc-700 rounded-full animate-spin ${
                is2D ? 'border-t-violet-500' : isDocument ? 'border-t-sky-500' : isRelief ? 'border-t-orange-500' : 'border-t-slate-500'
              }`} />
          }
        </div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-zinc-100 mb-1">
          {titleText}
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          {subtitleText}
        </p>
      </div>

      {/* Stage cards */}
      <div className="w-full max-w-sm space-y-2.5">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon
          const isCompleted = completedStages.includes(i)
          const isActive = activeStage === i

          return (
            <div
              key={stage.id}
              className={`rounded-2xl border p-4 transition-all duration-300 ${
                isCompleted
                  ? 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800/60 opacity-65'
                  : isActive
                  ? 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700/80 shadow-sm dark:shadow-black/20'
                  : 'bg-slate-100/50 dark:bg-zinc-900/30 border-transparent opacity-35'
              }`}
            >
              <div className="flex items-center gap-3 mb-0">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isCompleted ? 'bg-emerald-50 dark:bg-emerald-950/40' :
                  isActive ? stage.iconBg :
                  'bg-slate-100 dark:bg-zinc-800'
                }`}>
                  {isCompleted
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Icon className={`w-4 h-4 transition-colors ${
                        isActive ? `${stage.activeColor} animate-pulse` : 'text-slate-400 dark:text-zinc-600'
                      }`} />
                  }
                </div>

                {/* Label + sublabel */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight transition-colors ${
                    isCompleted
                      ? 'text-slate-400 dark:text-zinc-500'
                      : isActive
                      ? 'text-slate-800 dark:text-zinc-100'
                      : 'text-slate-400 dark:text-zinc-600'
                  }`}>
                    {stage.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                      {stage.sublabel}
                    </p>
                  )}
                </div>

                {/* Percentage */}
                {isActive && (
                  <span className="text-xs font-mono text-slate-400 dark:text-zinc-500 flex-shrink-0 w-8 text-right">
                    {Math.round(stageProgress)}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {(isActive || isCompleted) && (
                <div className={`mt-2.5 h-1 w-full rounded-full overflow-hidden ${
                  isCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-950/30'
                    : 'bg-slate-100 dark:bg-zinc-800'
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      isCompleted ? 'bg-emerald-400' : stage.barColor
                    }`}
                    style={{ width: isCompleted ? '100%' : `${stageProgress}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer status */}
      {!isDone && (
        <p className="mt-8 text-xs text-slate-400 dark:text-zinc-600 text-center">
          Step {Math.min(activeStage + 1, STAGES.length)} of {STAGES.length}
        </p>
      )}
    </div>
  )
}
