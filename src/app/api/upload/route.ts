import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BUCKET = 'capsule-assets'

function fileExt(file: File, defaultExt: '.jpg' | '.mp4' = '.jpg'): string {
  if (file.type === 'video/mp4') return '.mp4'
  if (file.type === 'video/webm') return '.webm'
  if (file.type === 'image/png') return '.png'
  if (file.type === 'image/webp') return '.webp'
  return defaultExt
}

async function uploadBlob(file: File, path: string, label: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) {
    console.error(`[/api/upload] frame upload failed: ${label} (path=${path})`, error.message)
    throw new Error(`Storage upload failed for ${label}: ${error.message}`)
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData()
    const mode = (data.get('mode') as string | null) ?? 'unknown'
    const mediaType = (data.get('mediaType') as string | null) ?? 'image'
    const asset = data.get('asset') as File | null
    if (!asset) {
      return NextResponse.json({ ok: false, error: 'Missing asset blob' }, { status: 400 })
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const prefix = `${mode}/${id}`
    const assetExt = fileExt(asset, mediaType === 'video' ? '.mp4' : '.jpg')

    // Collect multi-frame arrays before launching parallel uploads
    const pageFiles: File[] = []
    for (let i = 0; data.get(`pages[${i}]`) !== null; i++) {
      pageFiles.push(data.get(`pages[${i}]`) as File)
    }
    const frameFiles: File[] = []
    for (let i = 0; data.get(`frames[${i}]`) !== null; i++) {
      frameFiles.push(data.get(`frames[${i}]`) as File)
    }
    const reliefFiles: File[] = []
    for (let i = 0; data.get(`reliefFrames[${i}]`) !== null; i++) {
      reliefFiles.push(data.get(`reliefFrames[${i}]`) as File)
    }

    // Upload everything to Supabase in parallel. Promise.all rejects (and halts) on the
    // first failed frame, so partial/corrupted asset sets never reach the DB insert step.
    const [cloudUrl, cloudPages, cloudFrames, cloudReliefFrames] = await Promise.all([
      uploadBlob(asset, `${prefix}-asset${assetExt}`, 'asset'),
      Promise.all(pageFiles.map((f, i) => uploadBlob(f, `${prefix}-page-${i}${fileExt(f)}`, `page[${i}]`))),
      Promise.all(frameFiles.map((f, i) => uploadBlob(f, `${prefix}-frame-${i}${fileExt(f)}`, `frame[${i}]`))),
      Promise.all(reliefFiles.map((f, i) => uploadBlob(f, `${prefix}-relief-${i}${fileExt(f)}`, `reliefFrame[${i}]`))),
    ])

    const sizeBytes = [asset, ...pageFiles, ...frameFiles, ...reliefFiles]
      .reduce((sum, f) => sum + f.size, 0)

    return NextResponse.json({
      ok: true,
      cloudUrl,
      sizeBytes,
      ...(cloudPages.length ? { cloudPages } : {}),
      ...(cloudFrames.length ? { cloudFrames } : {}),
      ...(cloudReliefFrames.length ? { cloudReliefFrames } : {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown upload error'
    console.error('[/api/upload]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
