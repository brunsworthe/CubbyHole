'use client'

import { useState, useEffect, useCallback } from 'react'
import { Scan, Cpu, Layers, Sparkles, CheckCircle2, Eye, Brush, Wand2, Sun } from 'lucide-react'
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
    id: 'scanning',
    label: 'Scanning',
    sublabel: 'Capturing depth data from LiDAR array',
    icon: Scan,
    duration: 2200,
    activeColor: 'text-sky-500 dark:text-sky-400',
    barColor: 'bg-sky-500',
    iconBg: 'bg-sky-50 dark:bg-sky-950/50',
  },
  {
    id: 'pointcloud',
    label: 'Processing Point Cloud',
    sublabel: 'Aligning 12,847 depth points into 3D space',
    icon: Cpu,
    duration: 2800,
    activeColor: 'text-violet-500 dark:text-violet-400',
    barColor: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-950/50',
  },
  {
    id: 'mesh',
    label: 'Generating Mesh',
    sublabel: 'Building watertight surface geometry',
    icon: Layers,
    duration: 2400,
    activeColor: 'text-amber-500 dark:text-amber-400',
    barColor: 'bg-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
  },
  {
    id: 'textures',
    label: 'Optimizing Textures',
    sublabel: 'Applying color and material finish',
    icon: Sparkles,
    duration: 1800,
    activeColor: 'text-emerald-500 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
  },
]

const STAGES_2D: Stage[] = [
  {
    id: 'edges',
    label: 'Isolating Artwork Edges',
    sublabel: 'Tracing the outline from the canvas border',
    icon: Eye,
    duration: 2000,
    activeColor: 'text-rose-500 dark:text-rose-400',
    barColor: 'bg-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-950/50',
  },
  {
    id: 'brushstrokes',
    label: 'Analyzing Brushstrokes & Texture',
    sublabel: 'Reading every line, smudge and color blend',
    icon: Brush,
    duration: 2600,
    activeColor: 'text-fuchsia-500 dark:text-fuchsia-400',
    barColor: 'bg-fuchsia-500',
    iconBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/50',
  },
  {
    id: 'depthcanvas',
    label: 'Generating Depth Canvas',
    sublabel: 'Lifting layers off the page for a 3D feel',
    icon: Wand2,
    duration: 2200,
    activeColor: 'text-violet-500 dark:text-violet-400',
    barColor: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-950/50',
  },
  {
    id: 'shadows',
    label: 'Baking Interactive Shadows',
    sublabel: 'Adding light that responds to every tilt',
    icon: Sun,
    duration: 1800,
    activeColor: 'text-amber-500 dark:text-amber-400',
    barColor: 'bg-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
  },
]

export default function ProcessingState({ mode, onComplete }: Props) {
  const is2D = mode === 'artwork2d'
  const STAGES = is2D ? STAGES_2D : STAGES_3D

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
    ? (is2D ? 'Artwork Transformed' : 'Model Ready')
    : (is2D ? 'Bringing Your Artwork to Life' : 'Building Your Model')
  const subtitleText = isDone
    ? (is2D ? 'Your drawing now has depth, light and texture.' : 'Your 3D object has been captured successfully.')
    : 'This takes about 10 seconds…'

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Title */}
      <div className="mb-8 text-center">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition-colors duration-500 ${
          isDone
            ? 'bg-emerald-50 dark:bg-emerald-950/50'
            : is2D ? 'bg-violet-50 dark:bg-violet-950/40' : 'bg-amber-50 dark:bg-amber-950/40'
        }`}>
          {isDone
            ? <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            : <div className={`w-6 h-6 border-[3px] border-slate-200 dark:border-zinc-700 rounded-full animate-spin ${
                is2D ? 'border-t-violet-500' : 'border-t-amber-500'
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
